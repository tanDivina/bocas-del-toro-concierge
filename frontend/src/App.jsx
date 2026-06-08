import React, { useState, useEffect } from 'react';
import ScheduleView from './components/ScheduleView';
import ChatWidget from './components/ChatWidget';
import ControlPanel from './components/ControlPanel';
import ItineraryDoc from './components/ItineraryDoc';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : window.location.origin;

function App() {
  const [bookings, setBookings] = useState([]);
  const [tours, setTours] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [itineraryMarkdown, setItineraryMarkdown] = useState('');
  const [messages, setMessages] = useState([]);
  const [agentLogs, setAgentLogs] = useState(['🤖 Simulation environment initialized. Ready for weather events.']);
  const [loading, setLoading] = useState(false);
  const [isRealMongo, setIsRealMongo] = useState(false);

  // Load initial status
  useEffect(() => {
    fetchStatus();
  }, []);

  // Handle automatic theme adjustment depending on forecast alerts
  useEffect(() => {
    if (logistics && logistics.length > 0) {
      const hasRainAlert = logistics.some(l => l.alert === 'rain_warning');
      if (hasRainAlert) {
        document.body.classList.remove('theme-sunny');
        document.body.classList.add('theme-rainy');
      } else {
        document.body.classList.remove('theme-rainy');
        document.body.classList.add('theme-sunny');
      }
    } else {
      // Fallback/Default
      document.body.classList.remove('theme-rainy');
      document.body.classList.add('theme-sunny');
    }
  }, [logistics]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (!res.ok) throw new Error("Could not connect to FastAPI backend server.");
      const data = await res.json();
      setBookings(data.bookings || []);
      setTours(data.tours || []);
      setLogistics(data.logistics || []);
      setItineraryMarkdown(data.itinerary_markdown || '');
      setIsRealMongo(data.is_real_mongodb);
    } catch (error) {
      console.error("Error fetching status:", error);
      addLog(`❌ Server Error: ${error.message}. Is the backend running on port 8000?`);
    }
  };

  const addLog = (message) => {
    setAgentLogs((prev) => [...prev, message]);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || loading) return;

    // 1. Add user message to UI
    const updatedMessages = [...messages, { role: 'user', text }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      addLog(`💬 Guest sent message: "${text}"`);
      // 2. Call backend chat endpoint
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages
        })
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      // 3. Update agent chat logs in operator panel
      if (data.logs && data.logs.length > 0) {
        setAgentLogs((prev) => [...prev, ...data.logs]);
      }

      // 4. Add agent response to chat
      setMessages((prev) => [...prev, { role: 'model', text: data.response }]);
      addLog(`🤖 Agent responded: "${data.response.substring(0, 60)}..."`);
      
      // Refresh DB state in UI
      await fetchStatus();
    } catch (error) {
      console.error("Chat error:", error);
      addLog(`❌ Chat API Error: ${error.message}`);
      setMessages((prev) => [...prev, { 
        role: 'model', 
        text: "I'm having a little trouble communicating with the island server right now, my friend. Let's try that again. No stress!" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (payload) => {
    setLoading(true);
    addLog(`⛈️ Simulating Weather Event: Setting ${payload.date} to ${payload.weather} (${payload.alert})`);
    try {
      const res = await fetch(`${API_BASE}/api/simulate-weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Simulation request failed");
      const data = await res.json();

      // Update agent logs
      if (data.agent_logs && data.agent_logs.length > 0) {
        setAgentLogs((prev) => [...prev, ...data.agent_logs]);
      }

      // Post weather event announcement to chat widget
      if (data.agent_response) {
        setMessages((prev) => [...prev, { role: 'model', text: data.agent_response }]);
        addLog(`🤖 Weather Response Triggered: "${data.agent_response.substring(0, 60)}..."`);
      }

      await fetchStatus();
    } catch (error) {
      console.error("Simulation error:", error);
      addLog(`❌ Weather Shift Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondProposal = async (bookingId, date, alternativeTourId, accepted) => {
    setLoading(true);
    addLog(`👉 Decision: ${accepted ? 'CONFIRMED' : 'DECLINED'} rescheduling proposal for booking ${bookingId}`);
    try {
      const res = await fetch(`${API_BASE}/api/respond-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          new_date: date,
          alternative_tour_id: alternativeTourId,
          accepted
        })
      });

      if (!res.ok) throw new Error("Proposal response failed");
      const data = await res.json();

      if (accepted) {
        addLog(`✅ Booking updated and slots shifted successfully!`);
        setMessages((prev) => [...prev, { 
          role: 'model', 
          text: "Respect, my friend! I have processed the change in MongoDB, updated your booking slots, and generated your new official travel receipt below. Pura vida! 🌴" 
        }]);
      } else {
        addLog(`ℹ️ Proposal declined. Booking status preserved.`);
        setMessages((prev) => [...prev, { 
          role: 'model', 
          text: "No worries at all! I have kept your snorkeling trip. Let's hope for clear skies. Feel free to ask if you want to change anything else, respect!" 
        }]);
      }

      await fetchStatus();
    } catch (error) {
      console.error("Proposal error:", error);
      addLog(`❌ Proposal Update Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    addLog("🔄 Resetting database to initial seeded state...");
    try {
      const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      if (!res.ok) throw new Error("Reset request failed");
      
      setMessages([]);
      setAgentLogs(['🤖 Simulation environment initialized. Ready for weather events.']);
      addLog("✅ Database reset completed successfully!");
      
      await fetchStatus();
    } catch (error) {
      console.error("Reset error:", error);
      addLog(`❌ Database Reset Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="app-header">
        <div>
          <h1 className="app-title">🏝️ Bocas del Toro Concierge</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Eco-Tourism Logistics & Live Weather Rescheduler (MongoDB Track)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Database Connection:</span>
          <span style={{ 
            background: isRealMongo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(188, 86, 43, 0.15)', 
            color: isRealMongo ? 'var(--primary)' : 'var(--accent)', 
            border: `1px solid ${isRealMongo ? 'var(--primary)' : 'var(--accent)'}`, 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: 600 
          }}>
            {isRealMongo ? '🚀 MONGODB ATLAS (LIVE)' : '📦 LOCAL MOCK DB (FILE-BACKED)'}
          </span>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="main-grid">
        {/* Left Column: Schedule & Official Document */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ScheduleView 
            bookings={bookings} 
            tours={tours} 
            logistics={logistics} 
          />
          <ItineraryDoc 
            itineraryMarkdown={itineraryMarkdown} 
          />
        </div>

        {/* Right Column: Chat & Control Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ChatWidget 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            onRespondProposal={handleRespondProposal} 
            loading={loading}
            bookings={bookings}
          />
          <ControlPanel 
            logistics={logistics} 
            onSimulate={handleSimulate} 
            onReset={handleReset} 
            agentLogs={agentLogs} 
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
