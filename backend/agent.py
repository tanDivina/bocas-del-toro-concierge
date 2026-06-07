import os
import logging
import datetime
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from dotenv import load_dotenv

# Import tools from our mcp_server
from mcp_server import get_tours, get_bookings, check_weather, reschedule_booking, generate_itinerary, clear_execution_logs, execution_logs

load_dotenv()

logger = logging.getLogger("agent")

SYSTEM_PROMPT = """You are the Bocas del Toro Eco-Tourism Concierge & Logistics Dispatcher.
Your persona is warm, welcoming, and hospitable, reflecting the authentic Afro-Caribbean local spirit of Bocas del Toro, Panama.
You treat guests like family. Use local warmth in your tone (occasional light island phrasing like "welcome to paradise", "respect", "Pura vida", "no stress", but keep it highly professional, clear, and action-oriented).

Your primary responsibilities are:
1. Help guests view and manage their tour schedules. Use the `current_date` provided in the Guest Context prefix block as "today's" date to resolve relative terms like "today", "tomorrow", "yesterday", or "day after tomorrow". Do NOT ask the guest what today's date is!
2. Ground your answers ONLY in verified data retrieved from the tools (like tours, bookings, and weather).
3. If weather alerts are triggered (e.g. heavy rain on a day they have an outdoor tour):
   - You MUST run a planning check using your tools:
     a. Find their bookings for that day.
     b. Identify if any are outdoor tours.
     c. Search for indoor alternative tours that match their stay period and slot (morning/afternoon).
     d. Formulate a reschedule proposal. If changing the tour, explain the details and why it is a great option.
     e. Ask the guest for their approval (human-in-the-loop). DO NOT execute the database update until they agree!
     f. Once they agree (represented by their chat response or an API button click), run the reschedule tool, confirm the slots, and generate their updated itinerary document.

Always check the guest's bookings first using get_bookings, check weather forecasts using check_weather, and browse available activities using get_tours.
Be proactive. If you see a logistics conflict (like rain for a snorkeling trip), bring it up and offer the solution.

Respect the guest's constraints:
- Stay dates: Do not book/reschedule tours outside their stay dates.
- Slot capacity: Do not book tours that have 0 slots left.
"""

# Lazy initialization of ADK Agent and Runner to prevent startup failure when API key is not set
session_service = InMemorySessionService()
runner = None

def get_runner():
    global runner
    if runner is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set. Please add it to your backend/.env file.")
        
        adk_agent = Agent(
            name="BocasEcoConciergeAgent",
            model="gemini-2.5-flash",
            instruction=SYSTEM_PROMPT,
            tools=[get_tours, get_bookings, check_weather, reschedule_booking, generate_itinerary]
        )
        
        runner = Runner(
            agent=adk_agent,
            app_name="BocasConciergeApp",
            session_service=session_service,
            auto_create_session=True
        )
    return runner

def clear_adk_session(guest_id: str):
    """Deletes the ADK sessions associated with the user/guest to start fresh."""
    try:
        session_id = f"session_{guest_id}"
        # We use session_service.delete_session_sync to delete the session in memory.
        session_service.delete_session_sync(
            app_name="BocasConciergeApp",
            user_id=guest_id,
            session_id=session_id
        )
        logger.info(f"Deleted ADK session '{session_id}' for guest '{guest_id}'.")
    except Exception as e:
        logger.error(f"Error deleting ADK session: {e}")

def run_concierge_agent(guest_id: str, user_message: str, history: list = None) -> tuple[str, list]:
    """
    Runs the Gemini ADK Agent loop for a guest chat session.
    Returns:
        - final_response (str): The text response from the agent.
        - thinking_logs (list): A list of strings showing what tools were called and what they returned.
    """
    clear_execution_logs()
    
    try:
        current_runner = get_runner()
    except ValueError as ve:
        logger.error(str(ve))
        return "Respect, my friend! I need a valid `GEMINI_API_KEY` to talk to you. Please set it up in the `backend/.env` file and let's get going! 🌴", list(execution_logs)

    session_id = f"session_{guest_id}"

    # If the history is empty, clear the ADK session so that we start fresh.
    if not history:
        clear_adk_session(guest_id)

    # In ADK, we construct a types.Content object as the new user message.
    # We inject the guest context context silently in the background.
    current_date = datetime.date.today().strftime("%Y-%m-%d")
    contextualized_prompt = f"[Guest Context: guest_id='{guest_id}', current_date='{current_date}']\nUser message: {user_message}"
    
    new_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=contextualized_prompt)]
    )

    try:
        # Run ADK agent turn
        events = current_runner.run(
            user_id=guest_id,
            session_id=session_id,
            new_message=new_message
        )
        
        events_list = list(events)
        final_text = ""
        
        # Extract the final response text from the events list
        for event in events_list:
            if event.is_final_response() and event.content and event.content.parts:
                text_parts = [part.text for part in event.content.parts if part.text]
                if text_parts:
                    final_text = "".join(text_parts)
                    
        # Fallback if no is_final_response event has content
        if not final_text:
            for event in reversed(events_list):
                if event.content and event.content.parts and event.content.role == "model":
                    text_parts = [part.text for part in event.content.parts if part.text]
                    if text_parts:
                        final_text = "".join(text_parts)
                        break
                        
        if not final_text:
            final_text = "I processed your request, my friend. Let me know what else I can do for you. Pura vida! 🌴"
            
        return final_text, list(execution_logs)

    except Exception as e:
        logger.error(f"ADK Runner execution failed: {e}")
        return f"I'm having a brief connection issue with my island signals, my friend. Let's try again in a moment. (Error: {str(e)})", list(execution_logs)
