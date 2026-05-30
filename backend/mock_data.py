import logging
from db import get_db

logger = logging.getLogger("seeder")

TOURS_DATA = [
    {
        "_id": "t1",
        "name": "Cayos Zapatilla Reef Snorkeling",
        "location": "Bastimentos National Marine Park",
        "description": "Board a local panga boat to Cayos Zapatilla. Snorkel crystal-clear reefs, spot marine turtles, and walk white-sand beaches. Perfect for wildlife lovers.",
        "type": "outdoor",
        "price": 45.0,
        "capacity": 10,
        "available_slots": {
            "2026-05-30": 8,
            "2026-05-31": 10,
            "2026-06-01": 10
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
            "2026-05-30": 5,
            "2026-05-31": 6,
            "2026-06-01": 8
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
            "2026-05-30": 11,
            "2026-05-31": 12,
            "2026-06-01": 12
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
            "2026-05-30": 15,
            "2026-05-31": 15,
            "2026-06-01": 15
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
            "2026-05-30": 8,
            "2026-05-31": 8,
            "2026-06-01": 8
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
            "2026-05-30": 4,
            "2026-05-31": 4,
            "2026-06-01": 4
        },
        "tags": ["relaxation", "indoor"]
    }
]

GUESTS_DATA = [
    {
        "_id": "g1",
        "name": "Alex Mercer",
        "phone": "+507-6111-2222",
        "preferences": ["wildlife", "adventure"],
        "stay_start": "2026-05-29",
        "stay_end": "2026-06-02",
        "notes": "Family of 2, interested in local animals and active tours. Prefers morning schedules."
    }
]

BOOKINGS_DATA = [
    {
        "_id": "b1",
        "guest_id": "g1",
        "tour_id": "t1", # Snorkeling
        "date": "2026-05-30",
        "slot": "morning",
        "status": "confirmed",
        "price": 45.0
    },
    {
        "_id": "b2",
        "guest_id": "g1",
        "tour_id": "t2", # Canopy Zipline
        "date": "2026-05-31",
        "slot": "afternoon",
        "status": "confirmed",
        "price": 65.0
    }
]

LOGISTICS_DATA = [
    {"_id": "l_30", "date": "2026-05-30", "weather": "Sunny", "alert": "none"},
    {"_id": "l_31", "date": "2026-05-31", "weather": "Sunny", "alert": "none"},
    {"_id": "l_01", "date": "2026-06-01", "weather": "Sunny", "alert": "none"},
    {"_id": "l_02", "date": "2026-06-02", "weather": "Sunny", "alert": "none"}
]

def seed_db():
    current_db, is_real = get_db()
    
    # Check if tours collection has data
    tours_coll = current_db["tours"]
    if tours_coll.count_documents({}) == 0:
        logger.info("Database is empty. Seeding initial Bocas del Toro concierge data...")
        
        # Seed Tours
        for tour in TOURS_DATA:
            tours_coll.insert_one(tour)
            
        # Seed Guests
        guests_coll = current_db["guests"]
        for guest in GUESTS_DATA:
            guests_coll.insert_one(guest)
            
        # Seed Bookings
        bookings_coll = current_db["bookings"]
        for booking in BOOKINGS_DATA:
            bookings_coll.insert_one(booking)
            
        # Seed Logistics
        logistics_coll = current_db["logistics"]
        for log in LOGISTICS_DATA:
            logistics_coll.insert_one(log)
            
        logger.info("Successfully seeded database collections.")
    else:
        logger.info("Database already seeded. Skipping seeder.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_db()
