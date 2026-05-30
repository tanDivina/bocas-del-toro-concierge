import os
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Import tools from our mcp_server
from mcp_server import get_tours, get_bookings, check_weather, reschedule_booking, generate_itinerary, clear_execution_logs, execution_logs

load_dotenv()

logger = logging.getLogger("agent")

# Lazy initialization of Gemini client to prevent startup failure when key is not yet provided
client = None

def get_client():
    global client
    if client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set. Please add it to your backend/.env file.")
        client = genai.Client(api_key=api_key)
    return client

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

# Map function names to their python references
TOOLS_MAP = {
    "get_tours": get_tours,
    "get_bookings": get_bookings,
    "check_weather": check_weather,
    "reschedule_booking": reschedule_booking,
    "generate_itinerary": generate_itinerary
}

def execute_tool(name: str, args: dict) -> str:
    """Helper to execute a tool by name with arguments."""
    tool_func = TOOLS_MAP.get(name)
    if not tool_func:
        return f"Error: Tool '{name}' not found."
    
    try:
        # Pydantic or dict conversion may be needed
        # Since arguments are passed as a dictionary, we unpack them
        return tool_func(**args)
    except Exception as e:
        logger.error(f"Error executing tool {name}: {e}")
        return f"Error executing tool '{name}': {str(e)}"

def run_concierge_agent(guest_id: str, user_message: str, history: list = None) -> tuple[str, list]:
    """
    Runs the Gemini Agent loop for a guest chat session.
    Returns:
        - final_response (str): The text response from the agent.
        - thinking_logs (list): A list of strings showing what tools were called and what they returned.
    """
    clear_execution_logs()
    thinking_logs = []
    
    # 1. Setup conversation history/contents
    contents = []
    
    if history:
        for msg in history:
            role = msg.get("role")
            text = msg.get("text")
            if role and text:
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))
                
    # Append current user prompt
    # Inject guest context silently in the background to ground the agent with today's date
    import datetime
    current_date = datetime.date.today().strftime("%Y-%m-%d")
    contextualized_prompt = f"[Guest Context: guest_id='{guest_id}', current_date='{current_date}']\nUser message: {user_message}"
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=contextualized_prompt)]))
    
    # 2. Run the tool-calling execution loop (max 8 iterations to prevent infinite loops)
    max_iterations = 8
    for i in range(max_iterations):
        logger.info(f"Agent iteration {i+1}...")
        try:
            current_client = get_client()
        except ValueError as ve:
            logger.error(str(ve))
            return "Respect, my friend! I need a valid `GEMINI_API_KEY` to talk to you. Please set it up in the `backend/.env` file and let's get going! 🌴", list(execution_logs)

        try:
            # We use gemini-2.5-flash for fast reasoning and function calling
            response = current_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.3,
                    # Provide the python functions directly as tools
                    tools=[get_tours, get_bookings, check_weather, reschedule_booking, generate_itinerary]
                )
            )
        except Exception as e:
            logger.error(f"Gemini API generation failed: {e}")
            return f"I'm having a brief connection issue with my island signals, my friend. Let's try again in a moment. (Error: {str(e)})", list(execution_logs)

        # Check if the model returned function calls
        if response.function_calls:
            # Add the model's message (which contains the function calls) to history
            contents.append(response.candidates[0].content)
            
            tool_responses = []
            for call in response.function_calls:
                tool_name = call.name
                tool_args = call.args or {}
                
                # Format arguments for logging
                args_str = ", ".join(f"{k}={v}" for k, v in tool_args.items())
                thinking_logs.append(f"🔍 Agent decided to call **{tool_name}({args_str})**")
                
                # Execute the tool
                tool_result = execute_tool(tool_name, tool_args)
                
                thinking_logs.append(f"📥 Tool **{tool_name}** returned: {tool_result}")
                
                # Append tool output to the parts list
                part = types.Part.from_function_response(
                    name=tool_name,
                    response={"result": str(tool_result)}
                )
                tool_responses.append(part)
            
            # Append the user role message containing tool responses back to the model
            contents.append(types.Content(role="user", parts=tool_responses))
        else:
            # No function call, we got our final text response
            final_text = response.text or "I'm processing that for you, no stress."
            return final_text, list(execution_logs)
            
    return "I completed my planning checks, my friend. What can I do for you next?", list(execution_logs)
