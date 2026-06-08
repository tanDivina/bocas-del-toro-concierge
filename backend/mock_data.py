import logging
import datetime
from db import get_db

logger = logging.getLogger("seeder")

def get_dynamic_dates():
    today = datetime.date.today()
    d0 = (today).strftime("%Y-%m-%d")                     # Today
    d1 = (today + datetime.timedelta(days=1)).strftime("%Y-%m-%d") # Tomorrow
    d2 = (today + datetime.timedelta(days=2)).strftime("%Y-%m-%d") # Day 2
    d3 = (today + datetime.timedelta(days=3)).strftime("%Y-%m-%d") # Day 3
    
    # Stay start / end
    stay_start = (today - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    stay_end = (today + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
    
    return {
        "d0": d0,
        "d1": d1,
        "d2": d2,
        "d3": d3,
        "stay_start": stay_start,
        "stay_end": stay_end
    }

def get_tours_data(dates):
    return [
        {
            "_id": "t1",
            "name": "Cayos Zapatilla Reef Snorkeling",
            "location": "Bastimentos National Marine Park",
            "description": "Board a local panga boat to Cayos Zapatilla. Snorkel crystal-clear reefs, spot marine turtles, and walk white-sand beaches. Perfect for wildlife lovers.",
            "type": "outdoor",
            "price": 45.0,
            "capacity": 10,
            "available_slots": {
                dates["d0"]: 8,
                dates["d1"]: 10,
                dates["d2"]: 10
            },
            "tags": ["wildlife", "adventure", "water"]
        },
        {
            "_id": "t2",
            "name": "Bastimentos Canopy Zip Line",
            "location": "Red Frog Beach Canopy",
            "description": "Fly through the tropical rainforest canopy on 7 zipline cables. Get a bird's-eye view of Bastimentos Island and spot red frogs along the jungle floor.",
            "type": "outdoor",
            "price": 65.0,
            "capacity": 8,
            "available_slots": {
                dates["d0"]: 5,
                dates["d1"]: 6,
                dates["d2"]: 8
            },
            "tags": ["adventure", "forest"]
        },
        {
            "_id": "t3",
            "name": "Red Frog Rainforest Guided Hike",
            "location": "Red Frog Beach Reserve",
            "description": "A guided walk through the rainforest trails. Learn about indigenous flora, spot sloths, caimans, and the famous red poison dart frogs.",
            "type": "outdoor",
            "price": 30.0,
            "capacity": 12,
            "available_slots": {
                dates["d0"]: 11,
                dates["d1"]: 12,
                dates["d2"]: 12
            },
            "tags": ["wildlife", "hiking", "forest"]
        },
        {
            "_id": "t4",
            "name": "Green Cacao Chocolate Workshop",
            "location": "Bastimentos Cacao Hill",
            "description": "Learn the ancient chocolate-making process from bean to bar. Toast and grind raw cacao beans and make your own organic dark chocolate. Under cover, great for rainy days.",
            "type": "indoor",
            "price": 35.0,
            "capacity": 15,
            "available_slots": {
                dates["d0"]: 15,
                dates["d1"]: 15,
                dates["d2"]: 15
            },
            "tags": ["food", "culture", "indoor"]
        },
        {
            "_id": "t5",
            "name": "Afro-Caribbean Cooking Masterclass",
            "location": "Old Bank Town",
            "description": "Cook traditional Bocatoreño dishes (coconut rice, run-down fish stew, jerk chicken) with local chef Elena in a covered seaside kitchen. Sip fresh passionfruit juice.",
            "type": "indoor",
            "price": 40.0,
            "capacity": 8,
            "available_slots": {
                dates["d0"]: 8,
                dates["d1"]: 8,
                dates["d2"]: 8
            },
            "tags": ["food", "culture", "indoor"]
        },
        {
            "_id": "t6",
            "name": "Carenero Island Spa & Massage",
            "location": "Carenero Island Overwater Deck",
            "description": "Relax on a covered overwater deck with a 60-minute Swedish massage. Listen to the gentle waves under the deck while receiving a botanical coconut oil treatment.",
            "type": "indoor",
            "price": 75.0,
            "capacity": 4,
            "available_slots": {
                dates["d0"]: 4,
                dates["d1"]: 4,
                dates["d2"]: 4
            },
            "tags": ["relaxation", "indoor"]
        }
    ]

def get_guests_data(dates):
    return [
        {
            "_id": "g1",
            "name": "Alex Mercer",
            "phone": "+507-6111-2222",
            "preferences": ["wildlife", "adventure"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Family of 2, interested in local animals and active tours. Prefers morning schedules."
        }
    ]

def get_bookings_data(dates):
    return [
        {
            "_id": "b1",
            "guest_id": "g1",
            "tour_id": "t1", # Snorkeling
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 45.0
        },
        {
            "_id": "b2",
            "guest_id": "g1",
            "tour_id": "t2", # Canopy Zipline
            "date": dates["d1"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 65.0
        }
    ]

def get_logistics_data(dates):
    return [
        {"_id": "l_30", "date": dates["d0"], "weather": "Sunny", "alert": "none"},
        {"_id": "l_31", "date": dates["d1"], "weather": "Sunny", "alert": "none"},
        {"_id": "l_01", "date": dates["d2"], "weather": "Sunny", "alert": "none"},
        {"_id": "l_02", "date": dates["d3"], "weather": "Sunny", "alert": "none"}
    ]

def seed_db():
    current_db, is_real = get_db()
    
    # Check if tours collection has data
    tours_coll = current_db["tours"]
    if tours_coll.count_documents({}) == 0:
        logger.info("Database is empty. Seeding initial Bocas del Toro concierge data...")
        dates = get_dynamic_dates()
        
        # Seed Tours
        for tour in get_tours_data(dates):
            tours_coll.insert_one(tour)
            
        # Seed Guests
        guests_coll = current_db["guests"]
        for guest in get_guests_data(dates):
            guests_coll.insert_one(guest)
            
        # Seed Bookings
        bookings_coll = current_db["bookings"]
        for booking in get_bookings_data(dates):
            bookings_coll.insert_one(booking)
            
        # Seed Logistics
        logistics_coll = current_db["logistics"]
        for log in get_logistics_data(dates):
            logistics_coll.insert_one(log)
            
        logger.info("Successfully seeded database collections.")
    else:
        logger.info("Database already seeded. Skipping seeder.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_db()
