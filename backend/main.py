import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from db import db, is_real_mongo
from mock_data import seed_db
from agent import run_concierge_agent, clear_adk_session
from mcp_server import reschedule_booking, generate_itinerary

load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend_main")

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
class ChatPayload(BaseModel):
    message: str
    history: list = []  # list of dicts: {"role": "user"|"model", "text": "..."}

class WeatherSimulationPayload(BaseModel):
    date: str
    weather: str  # "Sunny", "Rainy", "Heavy Rain"
    alert: str    # "none", "rain_warning"

class ProposalPayload(BaseModel):
    booking_id: str
    new_date: str
    alternative_tour_id: str = None
    accepted: bool

# --- Endpoints ---

@app.get("/api/status")
async def get_status():
    """Retrieve full database state for frontend visualization."""
    try:
        tours = list(db["tours"].find({}))
        bookings = list(db["bookings"].find({}))
        guests = list(db["guests"].find({}))
        logistics = list(db["logistics"].find({}))
        
        # Clean mongo ObjectId to string for JSON serialization
        for collection in [tours, bookings, guests, logistics]:
            for doc in collection:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                    
        # Check if local itinerary exists
        itinerary_md = ""
        if os.path.exists("mock_itinerary.md"):
            with open("mock_itinerary.md", "r") as f:
                itinerary_md = f.read()

        return {
            "is_real_mongodb": is_real_mongo,
            "tours": tours,
            "bookings": bookings,
            "guests": guests,
            "logistics": logistics,
            "itinerary_markdown": itinerary_md
        }
    except Exception as e:
        logger.error(f"Error fetching status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_concierge(payload: ChatPayload):
    """Chat endpoint to communicate with the Gemini Concierge Agent."""
    guest_id = "g1"  # Grounded to our primary guest for the hackathon simulation
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
    guest_id = "g1"
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
            f"Please run a scheduling check using your tools. If this weather affects the guest's outdoor bookings on that day, "
            f"identify indoor alternatives from the tours database and suggest a reschedule proposal directly in the chat. "
            f"Explain the weather reason and details of the proposal clearly, and ask for their approval. "
            f"If no outdoor tours are affected, reassure the guest that their itinerary remains optimal.]"
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
    guest_id = "g1"
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

@app.post("/api/reset")
async def reset_simulation():
    """Reset database to initial seeded state (zero-out for repeat tests)."""
    try:
        # Delete existing
        db["tours"].delete_many({})
        db["guests"].delete_many({})
        db["bookings"].delete_many({})
        db["logistics"].delete_many({})
        
        # Remove itinerary file if exists
        if os.path.exists("mock_itinerary.md"):
            os.remove("mock_itinerary.md")
            
        # Seed
        seed_db()
        # Clear ADK session
        clear_adk_session("g1")
        return {"status": "success", "message": "Database and itinerary reset to initial seeded state."}
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        index_path = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend index.html not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
