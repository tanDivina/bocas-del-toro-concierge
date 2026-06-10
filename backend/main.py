import os
import logging
import datetime
import requests
import hmac
import hashlib
import base64
import json
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from dotenv import load_dotenv

from db import db, is_real_mongo
from mock_data import seed_db
from agent import run_concierge_agent, clear_adk_session
from mcp_server import reschedule_booking, generate_itinerary

load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend_main")

SECRET_KEY = os.getenv("SECRET_KEY", "BocasConciergeSecretSuperKey2026!")

def generate_guest_token(guest_id: str) -> str:
    payload = {
        "guest_id": guest_id,
        "exp": int(time.time()) + (86400 * 30) # 30 days
    }
    payload_json = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode('utf-8')).decode('utf-8')
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8')
    
    return f"{payload_b64}.{signature_b64}"

def verify_guest_token(token: str) -> str:
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, signature_b64 = parts[0], parts[1]
        
        expected_signature = hmac.new(
            SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).digest()
        expected_signature_b64 = base64.urlsafe_b64encode(expected_signature).decode('utf-8')
        
        if not hmac.compare_digest(signature_b64, expected_signature_b64):
            return None
            
        payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8')
        payload = json.loads(payload_json)
        
        if int(time.time()) > payload.get("exp", 0):
            return None
            
        return payload.get("guest_id")
    except Exception:
        return None

app = FastAPI(title="Bocas Eco-Concierge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    seed_db()

# --- Pydantic Schemas ---
class TokenGeneratePayload(BaseModel):
    guest_id: str

class ChatPayload(BaseModel):
    guest_id: str = "g1"
    message: str
    history: list = []  # list of dicts: {"role": "user"|"model", "text": "..."}

class WeatherSimulationPayload(BaseModel):
    guest_id: str = "g1"
    date: str
    weather: str  # "Sunny", "Rainy", "Heavy Rain"
    alert: str    # "none", "rain_warning"

class ProposalPayload(BaseModel):
    guest_id: str = "g1"
    booking_id: str
    new_date: str
    alternative_tour_id: str = None
    accepted: bool

class PMSSyncPayload(BaseModel):
    guest_id: str
    name: str
    phone: str
    preferences: list = []
    stay_start: str
    stay_end: str
    notes: str = ""
    bookings: list = []  # list of dicts with {"tour_id": "...", "date": "...", "slot": "...", "price": 0.0}
    hotel_id: Optional[str] = None
    hotel_name: Optional[str] = None

# --- Weather Sync Helper ---
def sync_live_weather():
    owm_key = os.getenv("OPENWEATHER_API_KEY")
    if not owm_key:
        return
    try:
        url = f"http://api.openweathermap.org/data/2.5/forecast?q=Bocas%20del%20Toro,PA&appid={owm_key}&units=metric"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            forecasts = data.get("list", [])
            
            # Fetch dates from our active logistics database
            dates_in_db = [doc["date"] for doc in db["logistics"].find({})]
            
            for date in dates_in_db:
                matching = []
                for f in forecasts:
                    if f.get("dt_txt", "").startswith(date):
                        matching.append(f)
                
                if matching:
                    rain_detected = False
                    heavy_rain_detected = False
                    descriptions = []
                    
                    for f in matching:
                        w_items = f.get("weather", [])
                        if w_items:
                            main_w = w_items[0].get("main", "")
                            desc = w_items[0].get("description", "")
                            descriptions.append(main_w)
                            
                            if main_w.lower() in ["rain", "drizzle", "thunderstorm"]:
                                rain_detected = True
                                if "heavy" in desc.lower() or "thunderstorm" in desc.lower():
                                    heavy_rain_detected = True
                    
                    if heavy_rain_detected:
                        weather_status = "Heavy Rain"
                        alert_status = "rain_warning"
                    elif rain_detected:
                        weather_status = "Rainy"
                        alert_status = "rain_warning"
                    else:
                        # Find most common weather term (Clear, Clouds, etc)
                        common_main = max(set(descriptions), key=descriptions.count) if descriptions else "Clear"
                        if common_main.lower() == "clouds":
                            weather_status = "Cloudy"
                        elif common_main.lower() == "clear":
                            weather_status = "Sunny"
                        else:
                            weather_status = common_main.capitalize()
                        alert_status = "none"
                    
                    db["logistics"].update_one(
                        {"date": date},
                        {"$set": {
                            "weather": weather_status,
                            "alert": alert_status
                        }}
                    )
            logger.info("Successfully synced real-world weather forecast with MongoDB logistics.")
    except Exception as e:
        logger.error(f"Failed to sync real-world weather: {e}")

# --- Endpoints ---

@app.get("/api/status")
async def get_status(guest_id: str = "g1", token: str = None):
    """Retrieve full database state for frontend visualization."""
    try:
        token_valid = False
        if token:
            resolved_guest_id = verify_guest_token(token)
            if resolved_guest_id:
                token_valid = True
                guest_id = resolved_guest_id
            else:
                raise HTTPException(status_code=401, detail="Invalid or expired secure token")

        # Auto-refresh database if dates are in the past relative to today
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        first_logistic = db["logistics"].find_one({}, sort=[("date", 1)])
        if first_logistic and first_logistic.get("date", "") < today_str:
            logger.info("Seeded dates are in the past. Automatically resetting database to current dates...")
            db["tours"].delete_many({})
            db["guests"].delete_many({})
            db["bookings"].delete_many({})
            db["logistics"].delete_many({})
            db["tenants"].delete_many({})
            # Remove all mock itineraries
            for file in os.listdir("."):
                if file.startswith("mock_itinerary_") and file.endswith(".md"):
                    try:
                        os.remove(file)
                    except Exception:
                        pass
            seed_db()
            for i in range(1, 11):
                clear_adk_session(f"g{i}")

        # Sync actual real-world weather before reading from DB
        sync_live_weather()

        tours = list(db["tours"].find({}))
        bookings = list(db["bookings"].find({}))
        guests = list(db["guests"].find({}))
        logistics = list(db["logistics"].find({}))
        tenants = list(db["tenants"].find({}))
        
        # Clean mongo ObjectId to string for JSON serialization
        for collection in [tours, bookings, guests, logistics, tenants]:
            for doc in collection:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                    
        # Check if local itinerary exists for this guest
        itinerary_md = ""
        filename = f"mock_itinerary_{guest_id}.md"
        if os.path.exists(filename):
            with open(filename, "r") as f:
                itinerary_md = f.read()
        else:
            # Generate it if it doesn't exist yet
            try:
                itinerary_md = generate_itinerary(guest_id)
            except Exception:
                itinerary_md = ""
 
        # Fetch tenant brand configuration if guest exists
        current_guest = db["guests"].find_one({"_id": guest_id})
        tenant_brand = None
        if current_guest:
            hotel_id = current_guest.get("hotel_id")
            if hotel_id:
                tenant_brand = db["tenants"].find_one({"_id": hotel_id})
                if tenant_brand and "_id" in tenant_brand:
                    tenant_brand["_id"] = str(tenant_brand["_id"])
 
        return {
            "is_real_mongodb": is_real_mongo,
            "guest_id": guest_id,
            "tours": tours,
            "bookings": bookings,
            "guests": guests,
            "logistics": logistics,
            "tenants": tenants,
            "itinerary_markdown": itinerary_md,
            "tenant_brand": tenant_brand,
            "secure_token_active": token_valid
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_concierge(payload: ChatPayload):
    """Chat endpoint to communicate with the Gemini Concierge Agent."""
    guest_id = payload.guest_id
    try:
        # Reformat history if necessary
        formatted_history = []
        for h in payload.history:
            role = "user" if h.get("role") == "user" else "model"
            text = h.get("text") or h.get("message")
            if text:
                formatted_history.append({"role": role, "text": text})

        response_text, logs = run_concierge_agent(
            guest_id=guest_id,
            user_message=payload.message,
            history=formatted_history
        )
        return {
            "response": response_text,
            "logs": logs
        }
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate-weather")
async def simulate_weather(payload: WeatherSimulationPayload):
    """Simulate weather alerts and trigger the agent's automated replanning loop."""
    guest_id = payload.guest_id
    try:
        # 1. Update weather logistics in database
        db["logistics"].update_one(
            {"date": payload.date},
            {"$set": {
                "weather": payload.weather,
                "alert": payload.alert
            }}
        )
        logger.info(f"Simulated weather updated for {payload.date}: {payload.weather} ({payload.alert})")

        # 2. Trigger the agent's planning process
        # Instruct the agent to inspect the weather warning and coordinate reschedules if bookings exist
        alert_prompt = (
            f"[SYSTEM EVENT: Weather alert updated for {payload.date} to {payload.weather}. "
            f"Please run a scheduling check using your tools. "
            f"MANDATE: You are in PROPOSAL MODE. Under no circumstances are you allowed to call the `reschedule_booking` tool. "
            f"If this weather affects the guest's outdoor bookings on that day, you must ONLY identify indoor alternatives "
            f"from the tours database and list them in the chat as a reschedule proposal. The user will select and confirm their choice "
            f"using the interactive dropdown on the proposal card in the frontend UI. Do NOT execute any database updates or "
            f"rescheduling yourself in this turn! Explain the weather reason and details of the proposal clearly, and ask for their preference.]"
        )
        
        response_text, logs = run_concierge_agent(
            guest_id=guest_id,
            user_message=alert_prompt,
            history=[]
        )
        
        return {
            "message": "Weather simulated successfully.",
            "agent_response": response_text,
            "agent_logs": logs
        }
    except Exception as e:
        logger.error(f"Error in weather simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/respond-proposal")
async def respond_proposal(payload: ProposalPayload):
    """Accept or decline a reschedule booking proposal."""
    guest_id = payload.guest_id
    try:
        if payload.accepted:
            # 1. Call reschedule tool
            res = reschedule_booking(
                booking_id=payload.booking_id,
                new_date=payload.new_date,
                alternative_tour_id=payload.alternative_tour_id
            )
            # 2. Regenerate itinerary document
            generate_itinerary(guest_id)
            
            return {
                "success": True,
                "message": f"Proposal accepted and processed. Details: {res}"
            }
        else:
            # Set booking status back to confirmed / log rejection
            db["bookings"].update_one(
                {"_id": payload.booking_id},
                {"$set": {"status": "confirmed"}}
            )
            return {
                "success": False,
                "message": "Proposal declined by guest. Booking restored to confirmed status."
            }
    except Exception as e:
        logger.error(f"Error responding to proposal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-secure-token")
async def generate_token_endpoint(payload: TokenGeneratePayload):
    try:
        # Verify guest exists
        guest = db["guests"].find_one({"_id": payload.guest_id})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest not found")
        
        token = generate_guest_token(payload.guest_id)
        return {
            "success": True,
            "token": token
        }
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset")
async def reset_simulation():
    """Reset database to initial seeded state (zero-out for repeat tests)."""
    try:
        # Delete existing
        db["tours"].delete_many({})
        db["guests"].delete_many({})
        db["bookings"].delete_many({})
        db["logistics"].delete_many({})
        db["tenants"].delete_many({})
        
        # Remove all guest itinerary files
        for file in os.listdir("."):
            if file.startswith("mock_itinerary_") and file.endswith(".md"):
                try:
                    os.remove(file)
                except Exception:
                    pass
            
        # Seed
        seed_db()
        for i in range(1, 11):
            clear_adk_session(f"g{i}")
        return {"status": "success", "message": "Database and itinerary reset to initial seeded state."}
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pms/sync-guest")
async def sync_guest_from_pms(payload: PMSSyncPayload):
    """Property Management System (PMS) webhook entry point to sync checked-in guests and reservations."""
    try:
        # Update or Insert Guest Profile
        guest_doc = {
            "name": payload.name,
            "phone": payload.phone,
            "preferences": payload.preferences,
            "stay_start": payload.stay_start,
            "stay_end": payload.stay_end,
            "notes": payload.notes,
            "hotel_id": payload.hotel_id,
            "hotel_name": payload.hotel_name
        }
        db["guests"].update_one(
            {"_id": payload.guest_id},
            {"$set": guest_doc},
            upsert=True
        )

        # Clear existing bookings for this guest if replacing
        db["bookings"].delete_many({"guest_id": payload.guest_id})

        # Insert new bookings, protecting against duplicate tour bookings during PMS sync
        seen_tours = set()
        synced_count = 0
        for index, b in enumerate(payload.bookings):
            tour_id = b.get("tour_id")
            if not tour_id:
                continue
            if tour_id in seen_tours:
                logger.warning(f"Discarding duplicate reservation for tour_id '{tour_id}' during PMS sync for guest {payload.guest_id}.")
                continue
            seen_tours.add(tour_id)
            
            booking_id = f"b_pms_{payload.guest_id}_{index}"
            booking_doc = {
                "_id": booking_id,
                "guest_id": payload.guest_id,
                "tour_id": tour_id,
                "date": b.get("date"),
                "slot": b.get("slot", "morning"),
                "status": b.get("status", "confirmed"),
                "price": b.get("price", 0.0)
            }
            db["bookings"].insert_one(booking_doc)
            synced_count += 1

        # Auto-generate initial itinerary for the guest
        generate_itinerary(payload.guest_id)
        clear_adk_session(payload.guest_id)

        logger.info(f"Successfully synced guest {payload.name} ({payload.guest_id}) from PMS with {synced_count} bookings.")
        return {
            "success": True,
            "message": f"Guest {payload.name} and {synced_count} bookings successfully synced via PMS API."
        }
    except Exception as e:
        logger.error(f"Error in PMS sync endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AddTourPayload(BaseModel):
    name: str
    type: str  # "outdoor" or "indoor"
    description: str
    price: float
    slots: list = ["morning", "afternoon"]
    capacity: int = 10
    location: str = "Bocas del Toro"

@app.post("/api/operator/add-tour")
async def add_tour(payload: AddTourPayload):
    """Register a new excursion in the database."""
    try:
        # Generate a unique custom tour ID
        timestamp = int(time.time() * 1000) % 10000
        tour_id = f"t_custom_{timestamp}"
        
        tour_doc = {
            "_id": tour_id,
            "name": payload.name,
            "type": payload.type,
            "description": payload.description,
            "price": payload.price,
            "slots": payload.slots,
            "capacity": payload.capacity,
            "location": payload.location
        }
        
        db["tours"].insert_one(tour_doc)
        logger.info(f"Successfully added custom tour: {payload.name} ({tour_id})")
        return {
            "success": True,
            "tour_id": tour_id,
            "message": f"Successfully registered new excursion: {payload.name}"
        }
    except Exception as e:
        logger.error(f"Error adding custom tour: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TenantBrandExtraction(BaseModel):
    name: str = Field(description="The elegant name of the hotel, resort, or luxury lodge (e.g. 'Nayara Bocas del Toro')")
    primary_color: str = Field(description="A curated, premium brand primary color in HSL format 'hsl(H, S%, L%)'. Must be dark-mode-friendly, highly vibrant, and elegant. Avoid raw dull colors; prefer sand gold, emerald green, warm amber, sea turquoise, hibiscus magenta.")
    primary_glow: str = Field(description="A matching transparent glow in rgba format 'rgba(R, G, B, 0.12)' that perfectly corresponds to the HSL color.")
    font: str = Field(description="A premium Google Font family name stack matching the resort's vibe (e.g. 'Playfair Display, Georgia, serif' or 'Outfit, Poppins, system-ui, sans-serif').")
    welcome_message: str = Field(description="A highly bespoke, premium luxury welcome message for the resort's guest dashboard. It must sound warm, elite, and hospitable (e.g., 'Welcome to your Balinese wellness sanctuary in the Caribbean. Pura vida! 🌸'). Do NOT start with repetitious cliché greetings like 'respect, my friend', make it unique.")

class BrandExtractPayload(BaseModel):
    url: str

@app.post("/api/tenant/extract-brand")
async def extract_brand_endpoint(payload: BrandExtractPayload):
    """Scrapes a URL and uses Gemini to extract and onboard a hotel's premium brand design system."""
    import re
    from urllib.parse import urlparse
    from google import genai
    from google.genai import types

    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
        
    # Ensure URL has a scheme
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    domain = ""
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc or parsed_url.path
        if domain.startswith("www."):
            domain = domain[4:]
    except Exception:
        domain = url

    # Clean domain to use as ID
    clean_id = re.sub(r'[^a-zA-Z0-9]', '_', domain).lower()
    if clean_id.endswith("_"):
        clean_id = clean_id[:-1]
    hotel_id = f"hotel_{clean_id}"

    # Scraping HTML metadata
    html_content = ""
    scrape_success = False
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            scrape_success = True
            text = res.text
            title_match = re.search(r'<title>(.*?)</title>', text, re.IGNORECASE)
            title = title_match.group(1) if title_match else ""
            
            # Find meta tags
            metas = re.findall(r'<meta\s+[^>]*name=["\'](description|keywords)["\'][^>]*content=["\']([^"\']*)["\']', text, re.IGNORECASE)
            meta_desc = " ".join([m[1] for m in metas])
            
            # Find headings
            headings = re.findall(r'<h[12]>(.*?)</h[12]>', text, re.IGNORECASE)[:5]
            headings_text = " ".join([re.sub(r'<[^>]*>', '', h) for h in headings])
            
            html_content = f"Title: {title}\nMeta: {meta_desc}\nHeadings: {headings_text}\nBody Snippet: {text[:3000]}"
    except Exception as e:
        logger.warning(f"Failed to scrape URL {url}: {e}. Falling back to domain heuristics.")

    # Formulate Prompt
    if scrape_success:
        prompt = (
            f"You are given scraped metadata and HTML context from a website URL: {url}.\n"
            f"HTML Context:\n{html_content}\n\n"
            f"Analyze this luxury brand, its identity, name, and style. "
            f"Create a complete premium dark-mode hospitality design system for this tenant."
        )
    else:
        prompt = (
            f"The website URL '{url}' could not be scraped directly. "
            f"Using the domain name '{domain}', identify the brand/hotel name, and design "
            f"a complete bespoke premium dark-mode hospitality design system for this tenant."
        )

    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set on the server")
            
        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TenantBrandExtraction,
                system_instruction=(
                    "You are an elite luxury hospitality brand manager and senior UI design system architect.\n"
                    "Your job is to generate a beautifully coordinated brand color, typography, and messaging system.\n"
                    "RULES:\n"
                    "1. name: Determine the elegant brand name (e.g. 'Faro Blanco' or 'The Ritz-Carlton, Maui').\n"
                    "2. primary_color: Pick a vibrant, highly elegant brand primary color in HSL format, e.g. 'hsl(215, 80%, 60%)'. "
                    "Avoid dark/light backgrounds or dull colors; pick a primary color that will pop beautifully as buttons, selections, and glowing borders on a dark-mode obsidian dashboard.\n"
                    "3. primary_glow: Generate a matching semi-transparent RGBA glow with 0.12 opacity, e.g. 'rgba(34, 150, 240, 0.12)'.\n"
                    "4. font: Select a premium Google Font family name stack (e.g. 'Outfit, Poppins, sans-serif' or 'Playfair Display, Georgia, serif' or 'Montserrat, Inter, sans-serif').\n"
                    "5. welcome_message: Create a warm, bespoke, luxury 1-sentence welcome message incorporating local elements, but DO NOT start it with cliches like 'respect' or 'my friend'. Keep it unique."
                )
            ),
        )
        
        extracted_data = json.loads(response.text)
        
        # Save or update in database
        tenant_doc = {
            "_id": hotel_id,
            "name": extracted_data.get("name", domain.capitalize()),
            "primary_color": extracted_data.get("primary_color", "hsl(38, 45%, 60%)"),
            "primary_glow": extracted_data.get("primary_glow", "rgba(212, 175, 55, 0.12)"),
            "font": extracted_data.get("font", "Inter, sans-serif"),
            "welcome_message": extracted_data.get("welcome_message", "Welcome to our paradise!"),
            "theme": f"theme-custom-{clean_id}"
        }
        
        db["tenants"].update_one(
            {"_id": hotel_id},
            {"$set": tenant_doc},
            upsert=True
        )
        
        logger.info(f"Successfully brand-onboarded hotel: {tenant_doc['name']} ({hotel_id})")
        return {
            "success": True,
            "hotel_id": hotel_id,
            "tenant_brand": tenant_doc,
            "message": f"Successfully brand-onboarded {tenant_doc['name']}!"
        }
        
    except Exception as e:
        logger.error(f"Error in brand extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Brand extraction failed: {str(e)}")

# Serve React Frontend Static Files in Production (if frontend/dist exists)
FRONTEND_DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend/dist")
if os.path.exists(FRONTEND_DIST_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    # Mount assets directory
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    # Serve index.html for all other non-API routes
    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        
        # Check if the file exists directly in the frontend dist root (like concierge_avatar.png)
        if catchall:
            file_path = os.path.join(FRONTEND_DIST_DIR, catchall)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
                
        index_path = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend index.html not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
