import os
import logging
import requests
import datetime
from mcp.server.fastmcp import FastMCP
from db import db

logger = logging.getLogger("mcp_server")

# Initialize FastMCP Server
mcp = FastMCP("BocasEcoConcierge")

# Shared list to store tool execution logs for the frontend console
execution_logs = []

def clear_execution_logs():
    execution_logs.clear()

def add_execution_log(msg):
    execution_logs.append(msg)

@mcp.tool()
def get_tours(guest_id: str = None) -> str:
    """Retrieve all available eco-tourism tours and activities in Bocas del Toro, including indoor/outdoor status and pricing. Pass guest_id to automatically filter out tours they have already booked on any day of their stay."""
    add_execution_log(f"🔍 Agent decided to call **get_tours(guest_id='{guest_id}')**")
    try:
        tours = list(db["tours"].find({}))
        if not tours:
            res = "No tours found in the database."
            add_execution_log(f"📥 Tool **get_tours** returned: {res}")
            return res
        
        booked_tour_ids = set()
        if guest_id:
            bookings = list(db["bookings"].find({"guest_id": guest_id}))
            booked_tour_ids = {b["tour_id"] for b in bookings}
        
        output = "### Available Activities in Bocas del Toro:\n"
        for t in tours:
            if t["_id"] in booked_tour_ids:
                continue  # Absolutely retire and omit already booked activities!
            output += (
                f"- **[{t['_id']}] {t['name']}**\n"
                f"  * Location: {t['location']}\n"
                f"  * Description: {t['description']}\n"
                f"  * Environment: {t['type']} (outdoor/indoor)\n"
                f"  * Price: ${t['price']}\n"
                f"  * Tags: {', '.join(t.get('tags', []))}\n"
            )
        add_execution_log(f"📥 Tool **get_tours** returned list of activities (filtered: {bool(guest_id)}).")
        return output
    except Exception as e:
        logger.error(f"Error getting tours: {e}")
        res = f"Error retrieving tours: {str(e)}"
        add_execution_log(f"📥 Tool **get_tours** returned error: {res}")
        return res

@mcp.tool()
def get_bookings(guest_id: str) -> str:
    """Fetch the active tour itinerary/bookings for a specific guest by their guest_id."""
    add_execution_log(f"🔍 Agent decided to call **get_bookings(guest_id='{guest_id}')**")
    try:
        bookings = list(db["bookings"].find({"guest_id": guest_id}))
        guest = db["guests"].find_one({"_id": guest_id})
        
        if not guest:
            res = f"Guest with ID '{guest_id}' not found."
            add_execution_log(f"📥 Tool **get_bookings** returned: {res}")
            return res
        
        output = f"### Itinerary for Guest: {guest['name']} (ID: {guest_id})\n"
        output += f"Preferences: {', '.join(guest.get('preferences', []))}\n"
        output += f"Stay: {guest['stay_start']} to {guest['stay_end']}\n\n"
        
        if not bookings:
            output += "No bookings currently scheduled."
            add_execution_log("📥 Tool **get_bookings** returned empty schedule.")
            return output
            
        output += "Current Bookings:\n"
        for b in bookings:
            tour = db["tours"].find_one({"_id": b["tour_id"]})
            tour_name = tour["name"] if tour else "Unknown Tour"
            tour_type = tour["type"] if tour else "outdoor"
            output += (
                f"- Booking ID: {b['_id']}\n"
                f"  * Tour: {tour_name} (ID: {b['tour_id']} - {tour_type})\n"
                f"  * Date: {b['date']} ({b['slot']})\n"
                f"  * Status: {b['status'].upper()}\n"
                f"  * Price: ${b['price']}\n"
            )
        add_execution_log(f"📥 Tool **get_bookings** returned schedule with {len(bookings)} bookings.")
        return output
    except Exception as e:
        res = f"Error getting bookings: {str(e)}"
        add_execution_log(f"📥 Tool **get_bookings** returned error: {res}")
        return res

@mcp.tool()
def check_weather(date: str) -> str:
    """Check the simulated or real weather forecast and alert status for a specific date in Bocas del Toro."""
    add_execution_log(f"🔍 Agent decided to call **check_weather(date='{date}')**")
    owm_key = os.getenv("OPENWEATHER_API_KEY")
    if owm_key:
        try:
            # Query OpenWeather 5-day / 3-hour forecast for Bocas del Toro, Panama
            url = f"http://api.openweathermap.org/data/2.5/forecast?q=Bocas%20del%20Toro,PA&appid={owm_key}&units=metric"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                forecasts = data.get("list", [])
                
                # Filter forecasts matching target date (format: YYYY-MM-DD)
                matching_forecasts = []
                for f in forecasts:
                    dt_txt = f.get("dt_txt", "")
                    if dt_txt.startswith(date):
                        matching_forecasts.append(f)
                
                if matching_forecasts:
                    rain_detected = False
                    heavy_rain_detected = False
                    temp_sum = 0
                    descriptions = []
                    
                    for f in matching_forecasts:
                        weather_items = f.get("weather", [])
                        if weather_items:
                            main_weather = weather_items[0].get("main", "")
                            desc = weather_items[0].get("description", "")
                            descriptions.append(desc)
                            
                            if main_weather.lower() in ["rain", "drizzle", "thunderstorm"]:
                                rain_detected = True
                                if "heavy" in desc.lower() or "thunderstorm" in desc.lower():
                                    heavy_rain_detected = True
                        
                        temp_sum += f.get("main", {}).get("temp", 28)
                    
                    avg_temp = temp_sum / len(matching_forecasts)
                    common_desc = max(set(descriptions), key=descriptions.count) if descriptions else "clear sky"
                    
                    if heavy_rain_detected:
                        weather_status = "Heavy Rain"
                        alert_status = "rain_warning"
                    elif rain_detected:
                        weather_status = "Rainy"
                        alert_status = "rain_warning"
                    else:
                        weather_status = "Sunny"
                        alert_status = "none"
                    
                    res_msg = (
                        f"Real Weather forecast for {date} (Bocas del Toro): {weather_status} ({common_desc.capitalize()}). "
                        f"Average Temp: {avg_temp:.1f}°C. Alert status: {alert_status.upper()}."
                    )
                    add_execution_log(f"📥 Tool **check_weather** returned live OWM forecast: {weather_status}")
                    return res_msg
        except Exception as e:
            logger.error(f"Failed to query OpenWeather API: {e}")
            add_execution_log("⚠️ Live weather lookup failed. Falling back to simulation DB.")

    # Fallback to local logistics database (Simulated weather)
    try:
        logistics = db["logistics"].find_one({"date": date})
        if not logistics:
            res = f"Weather for {date}: Sunny (No alerts)"
            add_execution_log(f"📥 Tool **check_weather** returned mock: {res}")
            return res
        
        weather = logistics.get("weather", "Sunny")
        alert = logistics.get("alert", "none")
        res_msg = f"Weather forecast for {date}: {weather} (Alert status: {alert.upper()})"
        add_execution_log(f"📥 Tool **check_weather** returned mock: {weather} (Alert: {alert})")
        return res_msg
    except Exception as e:
        res = f"Error checking weather: {str(e)}"
        add_execution_log(f"📥 Tool **check_weather** returned error: {res}")
        return res

@mcp.tool()
def reschedule_booking(booking_id: str, new_date: str, alternative_tour_id: str = None) -> str:
    """Reschedules an existing booking to a new date, and optionally shifts it to a different activity (alternative_tour_id). Adjusts inventory/slots accordingly."""
    add_execution_log(f"🔍 Agent decided to call **reschedule_booking(booking_id='{booking_id}', new_date='{new_date}', alternative_tour_id='{alternative_tour_id}')**")
    try:
        booking = db["bookings"].find_one({"_id": booking_id})
        if not booking:
            res = f"Error: Booking '{booking_id}' not found."
            add_execution_log(f"📥 Tool **reschedule_booking** returned error: {res}")
            return res
        
        old_date = booking["date"]
        old_tour_id = booking["tour_id"]
        target_tour_id = alternative_tour_id or old_tour_id
        
        # Fetch target tour details
        target_tour = db["tours"].find_one({"_id": target_tour_id})
        if not target_tour:
            res = f"Error: Target activity '{target_tour_id}' not found."
            add_execution_log(f"📥 Tool **reschedule_booking** returned error: {res}")
            return res
            
        # Check capacity/slots for the new slot
        slots = target_tour.get("available_slots", {})
        available = slots.get(new_date, 0)
        
        if available <= 0:
            res = f"Error: The activity '{target_tour['name']}' has no slots available on {new_date}."
            add_execution_log(f"📥 Tool **reschedule_booking** returned error: {res}")
            return res
            
        # Perform Rescheduling Transaction
        # 1. Update Booking
        db["bookings"].update_one(
            {"_id": booking_id},
            {"$set": {
                "date": new_date,
                "tour_id": target_tour_id,
                "price": target_tour["price"],
                "status": "confirmed"  # Confirmed after reschedule
            }}
        )
        
        # 2. Return slot to old activity/date
        old_tour = db["tours"].find_one({"_id": old_tour_id})
        if old_tour:
            old_slots = old_tour.get("available_slots", {})
            old_available = old_slots.get(old_date, 0)
            db["tours"].update_one(
                {"_id": old_tour_id},
                {"$set": {f"available_slots.{old_date}": old_available + 1}}
            )
            
        # 3. Take slot from new activity/date
        db["tours"].update_one(
            {"_id": target_tour_id},
            {"$set": {f"available_slots.{new_date}": available - 1}}
        )
        
        shift_msg = f"shifted to '{target_tour['name']}' and " if alternative_tour_id else ""
        res_msg = f"Success: Booking '{booking_id}' has been {shift_msg}rescheduled to {new_date}."
        add_execution_log(f"📥 Tool **reschedule_booking** returned: {res_msg}")
        return res_msg
    except Exception as e:
        res = f"Error rescheduling booking: {str(e)}"
        add_execution_log(f"📥 Tool **reschedule_booking** returned error: {res}")
        return res

@mcp.tool()
def generate_itinerary(guest_id: str) -> str:
    """Generate a clean, professional customer itinerary text in Markdown format for the guest's stay."""
    add_execution_log(f"🔍 Agent decided to call **generate_itinerary(guest_id='{guest_id}')**")
    try:
        guest = db["guests"].find_one({"_id": guest_id})
        if not guest:
            res = f"Error: Guest '{guest_id}' not found."
            add_execution_log(f"📥 Tool **generate_itinerary** returned error: {res}")
            return res
            
        bookings = list(db["bookings"].find({"guest_id": guest_id}))
        
        output = (
            f"# Bocas del Toro Concierge Itinerary\n"
            f"**Resort Stay:** {guest.get('hotel_name', 'Bocas Eco-Lodge')}\n"
            f"**Guest:** {guest['name']} | **Contact:** {guest['phone']}\n"
            f"**Stay Period:** {guest['stay_start']} to {guest['stay_end']}\n"
            f"**Preferences:** {', '.join(guest.get('preferences', []))}\n"
            f"**Status:** ACTIVE\n"
            f"---\n\n"
        )
        
        if not bookings:
            output += "You have no activities currently scheduled. Let your concierge know what you'd like to book!"
            add_execution_log("📥 Tool **generate_itinerary** compiled empty itinerary.")
            return output
            
        # Sort bookings by date
        sorted_bookings = sorted(bookings, key=lambda x: x['date'])
        
        total_cost = 0.0
        for b in sorted_bookings:
            tour = db["tours"].find_one({"_id": b["tour_id"]})
            tour_name = tour["name"] if tour else "Unknown activity"
            tour_location = tour["location"] if tour else "Bocas"
            tour_desc = tour["description"] if tour else ""
            
            output += (
                f"### 📅 {b['date']} - {b['slot'].capitalize()}\n"
                f"**Activity:** {tour_name}\n"
                f"**Location:** {tour_location}\n"
                f"**Price:** ${b['price']}\n"
                f"**Status:** {b['status'].upper()}\n"
                f"**Description:** {tour_desc}\n\n"
            )
            total_cost += b["price"]
            
        output += f"---\n**Total Package Cost:** ${total_cost:.2f}\n"
        output += "*Thank you for choosing Bocas del Toro Eco-Tourism. Direct any questions to your island concierge.*"
        
        # Save itinerary file to disk as well
        with open(f"mock_itinerary_{guest_id}.md", "w") as f:
            f.write(output)
            
        add_execution_log("📥 Tool **generate_itinerary** completed and saved.")
        return output
    except Exception as e:
        res = f"Error generating itinerary: {str(e)}"
        add_execution_log(f"📥 Tool **generate_itinerary** returned error: {res}")
        return res
