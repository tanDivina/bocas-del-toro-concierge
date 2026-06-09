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
            "name": "Finca Montezuma Chocolate Workshop",
            "location": "Isla San Cristóbal (Dolphin Bay)",
            "description": "A hands-on chocolate workshop in a jungle sanctuary. Harvest fresh cacao, learn the fermentation process, and grind raw cacao to craft your own organic truffles and chocolate bars.",
            "type": "indoor",
            "price": 40.0,
            "capacity": 12,
            "available_slots": {
                dates["d0"]: 12,
                dates["d1"]: 12,
                dates["d2"]: 12
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
            "notes": "Family of 2, interested in local animals and active tours. Prefers morning schedules.",
            "hotel_id": "hotel_nayara",
            "hotel_name": "Nayara Bocas del Toro"
        },
        {
            "_id": "g2",
            "name": "Sarah Connor",
            "phone": "+507-6222-3333",
            "preferences": ["wildlife", "culture", "food"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Traveling solo. Passionate about local recipes, rainforest flora/fauna, and sustainability.",
            "hotel_id": "hotel_lacoralina",
            "hotel_name": "La Coralina Island House"
        },
        {
            "_id": "g3",
            "name": "Liam Neeson",
            "phone": "+507-6333-4444",
            "preferences": ["relaxation", "indoor"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Requires peaceful surroundings. Interested in wellness treatments, spa days, and private settings.",
            "hotel_id": "hotel_sweetbocas",
            "hotel_name": "Sweet Bocas"
        },
        {
            "_id": "g4",
            "name": "Bruce Wayne",
            "phone": "+507-6444-5555",
            "preferences": ["relaxation", "indoor"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "VIP guest. Requires extreme privacy and discretion. Arriving via private heli/yacht.",
            "hotel_id": "hotel_bocasvillas",
            "hotel_name": "Bocas Luxury Villas"
        },
        {
            "_id": "g5",
            "name": "Indiana Jones",
            "phone": "+507-6555-6666",
            "preferences": ["adventure", "wildlife"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Interested in deep jungle treks, archaeological history, and indigenous flora/fauna.",
            "hotel_id": "hotel_redfrog",
            "hotel_name": "Red Frog Beach Resort"
        },
        {
            "_id": "g6",
            "name": "Lara Croft",
            "phone": "+507-6666-7777",
            "preferences": ["adventure"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Extremely active explorer. Interested in ziplines, reef snorkeling, and boat-based expeditions.",
            "hotel_id": "hotel_nayara",
            "hotel_name": "Nayara Bocas del Toro"
        },
        {
            "_id": "g7",
            "name": "Tony Stark",
            "phone": "+507-6777-8888",
            "preferences": ["relaxation", "food"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Inquires about exclusive dining, private overwater massage tables, and high-end botanical spa oils.",
            "hotel_id": "hotel_sweetbocas",
            "hotel_name": "Sweet Bocas"
        },
        {
            "_id": "g8",
            "name": "Hermione Granger",
            "phone": "+507-6888-9999",
            "preferences": ["culture", "wildlife"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Traveling for ecological research. Fascinated by local marine life and cacao botany.",
            "hotel_id": "hotel_lacoralina",
            "hotel_name": "La Coralina Island House"
        },
        {
            "_id": "g9",
            "name": "James Bond",
            "phone": "+507-6999-0000",
            "preferences": ["relaxation", "food"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Prefers premium seaside terraces, sunset cocktails, and high-end overwater massages.",
            "hotel_id": "hotel_bocasvillas",
            "hotel_name": "Bocas Luxury Villas"
        },
        {
            "_id": "g10",
            "name": "Luke Skywalker",
            "phone": "+507-6000-1111",
            "preferences": ["wildlife", "adventure"],
            "stay_start": dates["stay_start"],
            "stay_end": dates["stay_end"],
            "notes": "Traveling with family. Prefers nature hikes and marine tours with clean ocean viewpoints.",
            "hotel_id": "hotel_redfrog",
            "hotel_name": "Red Frog Beach Resort"
        }
    ]

def get_bookings_data(dates):
    return [
        # Guest 1 (Alex Mercer) Bookings
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
        },
        # Guest 2 (Sarah Connor) Bookings
        {
            "_id": "b3",
            "guest_id": "g2",
            "tour_id": "t3", # Rainforest Guided Hike
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 30.0
        },
        {
            "_id": "b4",
            "guest_id": "g2",
            "tour_id": "t5", # Afro-Caribbean Cooking Masterclass
            "date": dates["d1"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 40.0
        },
        # Guest 3 (Liam Neeson) Bookings
        {
            "_id": "b5",
            "guest_id": "g3",
            "tour_id": "t6", # Carenero Island Spa & Massage
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 75.0
        },
        # Guest 4 (Bruce Wayne) Bookings
        {
            "_id": "b6",
            "guest_id": "g4",
            "tour_id": "t6", # Carenero Island Spa & Massage
            "date": dates["d1"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 75.0
        },
        # Guest 5 (Indiana Jones) Bookings
        {
            "_id": "b7",
            "guest_id": "g5",
            "tour_id": "t3", # Rainforest Hike
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 30.0
        },
        # Guest 6 (Lara Croft) Bookings
        {
            "_id": "b8",
            "guest_id": "g6",
            "tour_id": "t2", # Canopy Zipline
            "date": dates["d1"],
            "slot": "morning",
            "status": "confirmed",
            "price": 65.0
        },
        # Guest 7 (Tony Stark) Bookings
        {
            "_id": "b9",
            "guest_id": "g7",
            "tour_id": "t4", # Chocolate Workshop
            "date": dates["d0"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 40.0
        },
        # Guest 8 (Hermione Granger) Bookings
        {
            "_id": "b10",
            "guest_id": "g8",
            "tour_id": "t5", # Cooking Masterclass
            "date": dates["d1"],
            "slot": "morning",
            "status": "confirmed",
            "price": 40.0
        },
        # Guest 9 (James Bond) Bookings
        {
            "_id": "b11",
            "guest_id": "g9",
            "tour_id": "t6", # Overwater Spa & Massage
            "date": dates["d0"],
            "slot": "afternoon",
            "status": "confirmed",
            "price": 75.0
        },
        # Guest 10 (Luke Skywalker) Bookings
        {
            "_id": "b12",
            "guest_id": "g10",
            "tour_id": "t1", # Reef Snorkeling
            "date": dates["d0"],
            "slot": "morning",
            "status": "confirmed",
            "price": 45.0
        }
    ]

def get_logistics_data(dates):
    return [
        {"_id": "l_30", "date": dates["d0"], "weather": "Sunny", "alert": "none"},
        {"_id": "l_31", "date": dates["d1"], "weather": "Sunny", "alert": "none"},
        {"_id": "l_01", "date": dates["d2"], "weather": "Sunny", "alert": "none"},
        {"_id": "l_02", "date": dates["d3"], "weather": "Sunny", "alert": "none"}
    ]

def get_tenants_data():
    return [
        {
            "_id": "hotel_nayara",
            "name": "Nayara Bocas del Toro",
            "primary_color": "hsl(188, 86%, 38%)",
            "primary_glow": "rgba(15, 186, 211, 0.12)",
            "font": "Inter, system-ui, sans-serif",
            "welcome_message": "Your luxury overwater villa experience begins now. Pura vida! 🌴",
            "theme": "theme-ocean"
        },
        {
            "_id": "hotel_lacoralina",
            "name": "La Coralina Island House",
            "primary_color": "hsl(45, 60%, 55%)",
            "primary_glow": "rgba(212, 175, 55, 0.12)",
            "font": "var(--font-serif), Georgia, serif",
            "welcome_message": "Welcome to your Balinese wellness sanctuary in the Caribbean. Pura vida! 🌸",
            "theme": "theme-wellness"
        },
        {
            "_id": "hotel_sweetbocas",
            "name": "Sweet Bocas",
            "primary_color": "hsl(330, 75%, 45%)",
            "primary_glow": "rgba(219, 39, 119, 0.12)",
            "font": "Outfit, Poppins, system-ui, sans-serif",
            "welcome_message": "Step into absolute, sustainable luxury on our private island estate. Respect! 🌺",
            "theme": "theme-hibiscus"
        },
        {
            "_id": "hotel_bocasvillas",
            "name": "Bocas Luxury Villas",
            "primary_color": "hsl(150, 65%, 35%)",
            "primary_glow": "rgba(34, 197, 94, 0.12)",
            "font": "Roboto, system-ui, sans-serif",
            "welcome_message": "Your boutique cliffside eco-villa retreat is ready, my friend. No stress! 🦜",
            "theme": "theme-forest"
        },
        {
            "_id": "hotel_redfrog",
            "name": "Red Frog Beach Resort",
            "primary_color": "hsl(15, 85%, 50%)",
            "primary_glow": "rgba(249, 115, 22, 0.12)",
            "font": "Poppins, Inter, system-ui, sans-serif",
            "welcome_message": "Welcome to our vibrant beachfront jungle playground. Pura vida! 🐸",
            "theme": "theme-volcano"
        }
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
            
        # Seed Tenants (Branding)
        tenants_coll = current_db["tenants"]
        for tenant in get_tenants_data():
            tenants_coll.insert_one(tenant)
            
        logger.info("Successfully seeded database collections.")
    else:
        logger.info("Database already seeded. Skipping seeder.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_db()
