import os
import json
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("db_layer")

class MockCollection:
    def __init__(self, db_path, collection_name):
        self.db_path = db_path
        self.collection_name = collection_name

    def _read_data(self):
        if not os.path.exists(self.db_path):
            return {}
        try:
            with open(self.db_path, 'r') as f:
                return json.load(f)
        except Exception:
            return {}

    def _write_data(self, data):
        try:
            with open(self.db_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write mock db: {e}")

    def find(self, query=None):
        query = query or {}
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        results = []
        for item in items:
            match = True
            for k, v in query.items():
                if k == "$or":
                    or_match = False
                    for cond in v:
                        cond_match = True
                        for ck, cv in cond.items():
                            if item.get(ck) != cv:
                                cond_match = False
                                break
                        if cond_match:
                            or_match = True
                            break
                    if not or_match:
                        match = False
                        break
                elif item.get(k) != v:
                    match = False
                    break
            if match:
                results.append(item)
        return results

    def find_one(self, query=None):
        results = self.find(query)
        return results[0] if results else None

    def insert_one(self, document):
        db_data = self._read_data()
        if self.collection_name not in db_data:
            db_data[self.collection_name] = []
        
        # Ensure _id exists
        if '_id' not in document:
            document['_id'] = str(len(db_data[self.collection_name]) + 1)
        
        db_data[self.collection_name].append(document)
        self._write_data(db_data)
        
        class InsertOneResult:
            inserted_id = document['_id']
        return InsertOneResult()

    def update_one(self, query, update):
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        updated = False
        
        for item in items:
            # Check match
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            
            if match:
                # Apply updates (typically $set)
                if '$set' in update:
                    for uk, uv in update['$set'].items():
                        if '.' in uk:
                            # Handle nested keys e.g. "available_slots.2026-05-30"
                            parts = uk.split('.')
                            curr = item
                            for p in parts[:-1]:
                                curr = curr.setdefault(p, {})
                            curr[parts[-1]] = uv
                        else:
                            item[uk] = uv
                else:
                    for uk, uv in update.items():
                        if '.' in uk:
                            parts = uk.split('.')
                            curr = item
                            for p in parts[:-1]:
                                curr = curr.setdefault(p, {})
                            curr[parts[-1]] = uv
                        else:
                            item[uk] = uv
                updated = True
                break
                
        if updated:
            db_data[self.collection_name] = items
            self._write_data(db_data)
            
        class UpdateResult:
            matched_count = 1 if updated else 0
            modified_count = 1 if updated else 0
        return UpdateResult()

    def delete_one(self, query):
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        new_items = []
        deleted = False
        
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match and not deleted:
                deleted = True
            else:
                new_items.append(item)
                
        if deleted:
            db_data[self.collection_name] = new_items
            self._write_data(db_data)
            
        class DeleteResult:
            deleted_count = 1 if deleted else 0
        return DeleteResult()

    def delete_many(self, query):
        db_data = self._read_data()
        items = db_data.get(self.collection_name, [])
        new_items = []
        deleted_count = 0
        
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                deleted_count += 1
            else:
                new_items.append(item)
                
        if deleted_count > 0:
            db_data[self.collection_name] = new_items
            self._write_data(db_data)
            
        class DeleteResult:
            pass
        res = DeleteResult()
        res.deleted_count = deleted_count
        return res

    def count_documents(self, query=None):
        return len(self.find(query))

class MockDB:
    def __init__(self, db_path):
        self.db_path = db_path

    def __getitem__(self, name):
        return MockCollection(self.db_path, name)

# Database Selector
def get_db():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        logger.info("MONGO_URI not set. Falling back to high-fidelity JSON Mock DB.")
        return MockDB("mock_db.json"), False

    try:
        # Check connection with 2 second timeout
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        client.server_info()  # Forces connection check
        logger.info("Successfully connected to MongoDB server.")
        # Create/use database named "bocas_concierge"
        return client["bocas_concierge"], True
    except (ConnectionFailure, Exception) as e:
        logger.warning(f"Failed to connect to MongoDB URI: {e}. Falling back to high-fidelity JSON Mock DB.")
        return MockDB("mock_db.json"), False

db, is_real_mongo = get_db()
