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
  const [guests, setGuests] = useState([]);
  const [itineraryMarkdown, setItineraryMarkdown] = useState('');
  const [messages, setMessages] = useState([]);
  const [agentLogs, setAgentLogs] = useState(['🤖 Simulation environment initialized. Ready for weather events.']);
  const [loading, setLoading] = useState(false);
  const [isRealMongo, setIsRealMongo] = useState(false);
  const [guestId, setGuestId] = useState('g1');
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [isGuestViewOnly, setIsGuestViewOnly] = useState(false);
  const [welcomeCardGuestId, setWelcomeCardGuestId] = useState('g1');
  const [token, setToken] = useState(null);
  const [tenantBrand, setTenantBrand] = useState(null);
  const [isSecureModeActive, setIsSecureModeActive] = useState(false);
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [operatorFlyerToken, setOperatorFlyerToken] = useState('');
  const lastGuestIdRef = React.useRef('g1');

  const [view, setView] = useState('landing');

  // Parse query parameters for direct link routing on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');
    const urlGuestId = params.get('guest_id');
    const urlToken = params.get('token');
    
    if (urlToken) {
      setToken(urlToken);
      setIsSecureModeActive(true);
      setView('guest');
      setIsGuestViewOnly(true);
    } else if (urlGuestId) {
      setGuestId(urlGuestId);
      setView('guest');
      setIsGuestViewOnly(true);
    } else if (urlView && ['landing', 'guest', 'operator', 'integrations'].includes(urlView)) {
      setView(urlView);
    }
  }, []);

  // Load initial status when guestId or view changes
  useEffect(() => {
    if (token) {
      fetchStatus(null, token);
    } else {
      fetchStatus(guestId);
    }
  }, [guestId, token]);

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

  // Handle locking body scroll for dashboard layouts to keep viewport perfectly stable
  useEffect(() => {
    if (view === 'guest' || view === 'operator') {
      document.body.classList.add('dashboard-layout');
      document.documentElement.classList.add('dashboard-layout');
    } else {
      document.body.classList.remove('dashboard-layout');
      document.documentElement.classList.remove('dashboard-layout');
    }
    return () => {
      document.body.classList.remove('dashboard-layout');
      document.documentElement.classList.remove('dashboard-layout');
    };
  }, [view]);

  const fetchStatus = async (currentGuestId = 'g1', currentToken = null) => {
    try {
      const activeToken = currentToken || token;
      let url = `${API_BASE}/api/status`;
      if (activeToken) {
        url += `?token=${encodeURIComponent(activeToken)}`;
      } else {
        url += `?guest_id=${currentGuestId}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not connect to FastAPI backend server.");
      const data = await res.json();
      setBookings(data.bookings || []);
      setTours(data.tours || []);
      setLogistics(data.logistics || []);
      setGuests(data.guests || []);
      setTenantBrand(data.tenant_brand || null);
      
      if (data.guest_id) {
        setGuestId(data.guest_id);
      }
      
      const newMarkdown = data.itinerary_markdown || '';
      setItineraryMarkdown(prev => {
        // Trigger the updated itinerary popup modal ONLY if the guest ID remains the same
        // (This avoids triggering the modal merely when switching active guest profiles)
        if (lastGuestIdRef.current === data.guest_id) {
          if (prev && newMarkdown && prev !== newMarkdown) {
            setShowItineraryModal(true);
          }
        }
        return newMarkdown;
      });
      
      // Update our guest tracker ref with the newly loaded guest ID
      if (data.guest_id) {
        lastGuestIdRef.current = data.guest_id;
      }
      
      setIsRealMongo(data.is_real_mongodb);
    } catch (error) {
      console.error("Error fetching status:", error);
      addLog(`❌ Server Error: ${error.message}. Is the backend running on port 8000?`);
    }
  };

  // Dynamic Live Theme Engine
  useEffect(() => {
    if (tenantBrand) {
      const root = document.documentElement;
      root.style.setProperty('--primary', tenantBrand.primary_color);
      root.style.setProperty('--primary-glow', tenantBrand.primary_glow);
      
      if (tenantBrand.font) {
        root.style.setProperty('--font-sans', tenantBrand.font);
      }
      
      if (tenantBrand.primary_color.includes('hsl')) {
        const colorValue = tenantBrand.primary_color.replace('hsl(', '').replace(')', '');
        root.style.setProperty('--border-color', `hsla(${colorValue}, 0.16)`);
        root.style.setProperty('--border-glow', `hsla(${colorValue}, 0.35)`);
        root.style.setProperty('--msg-user-bg', `hsla(${colorValue}, 0.1)`);
        root.style.setProperty('--msg-agent-bg', `${tenantBrand.primary_glow}`);
      }
    } else {
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-glow');
      root.style.removeProperty('--font-sans');
      root.style.removeProperty('--border-color');
      root.style.removeProperty('--border-glow');
      root.style.removeProperty('--msg-user-bg');
      root.style.removeProperty('--msg-agent-bg');
    }
  }, [tenantBrand]);

  // Generate secure token for Operator flyer on-the-fly
  useEffect(() => {
    if (isSecureMode && welcomeCardGuestId) {
      fetch(`${API_BASE}/api/generate-secure-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: welcomeCardGuestId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOperatorFlyerToken(data.token);
        }
      })
      .catch(err => console.error("Error generating secure token for flyer:", err));
    }
  }, [welcomeCardGuestId, isSecureMode]);

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
      addLog(`💬 Guest [${guestId}] sent message: "${text}"`);
      // 2. Call backend chat endpoint
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guestId,
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
      addLog(`🤖 Agent responded to [${guestId}]: "${data.response.substring(0, 60)}..."`);
      
      // Refresh DB state in UI
      await fetchStatus(guestId);
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
        body: JSON.stringify({
          ...payload,
          guest_id: guestId
        })
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

      await fetchStatus(guestId);
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
          guest_id: guestId,
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

      await fetchStatus(guestId);
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
      
      await fetchStatus(guestId);
    } catch (error) {
      console.error("Reset error:", error);
      addLog(`❌ Database Reset Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePMSSync = async (pmsPayload) => {
    setLoading(true);
    addLog(`🛎️ PMS Webhook: Syncing reservation for new guest '${pmsPayload.name}'...`);
    try {
      const res = await fetch(`${API_BASE}/api/pms/sync-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pmsPayload)
      });
      if (!res.ok) throw new Error("PMS synchronization request failed");
      const data = await res.json();
      addLog(`✅ PMS Synced: ${data.message}`);
      setGuestId(pmsPayload.guest_id);
      await fetchStatus(pmsPayload.guest_id);
      setView('guest');
    } catch (error) {
      console.error("PMS sync error:", error);
      addLog(`❌ PMS Webhook Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Premium Header with Navigation */}
      <header className="app-header">
        {isGuestViewOnly ? (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h1 className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', color: 'var(--primary)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <path d="M12 22c1-4 1-8 0-12" />
                  <path d="M5 22c2-.5 12-.5 14 0" />
                  <path d="M12 10c-3-2-7-1-9 2" />
                  <path d="M12 10c3-2 7-1 9 2" />
                  <path d="M12 10c-4 .5-8 3-9 7" />
                  <path d="M12 10c4 .5 8 3 9 7" />
                  <path d="M12 10c-1.5-4-5-6-8-6" />
                  <path d="M12 10c1.5-4 5-6 8-6" />
                </svg>
                {tenantBrand?.name || guests.find(g => g._id === guestId)?.hotel_name || 'La Coralina Island House'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                Personalized Digital Eco-Concierge Companion
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!isSecureModeActive && (
                <button 
                  onClick={() => {
                    const newUrl = window.location.pathname + '?view=operator';
                    window.history.pushState({}, '', newUrl);
                    setIsGuestViewOnly(false);
                    setView('operator');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-glow)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Back to Operator Dashboard
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--primary-glow)', border: '1px solid var(--border-color)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                {isSecureModeActive ? 'SECURE CLIENT VIEW' : 'GUEST PORTAL ACTIVE'}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h1 className="app-title" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setView('landing')}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <path d="M12 22c1-4 1-8 0-12" />
                  <path d="M5 22c2-.5 12-.5 14 0" />
                  <path d="M12 10c-3-2-7-1-9 2" />
                  <path d="M12 10c3-2 7-1 9 2" />
                  <path d="M12 10c-4 .5-8 3-9 7" />
                  <path d="M12 10c4 .5 8 3 9 7" />
                  <path d="M12 10c-1.5-4-5-6-8-6" />
                  <path d="M12 10c1.5-4 5-6 8-6" />
                </svg>
                Bocas del Toro Concierge
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Local Experience & Eco-Tourism Coordinator
              </p>
            </div>

            {/* Navigation Tabs */}
            <nav className="nav-links">
              <button className={`nav-link ${view === 'landing' ? 'active' : ''}`} onClick={() => setView('landing')}>
                Home / About
              </button>
              <button className={`nav-link ${view === 'guest' ? 'active' : ''}`} onClick={() => setView('guest')}>
                Guest Portal
              </button>
              <button className={`nav-link ${view === 'operator' ? 'active' : ''}`} onClick={() => setView('operator')}>
                Operator Console
              </button>
              <button className={`nav-link ${view === 'integrations' ? 'active' : ''}`} onClick={() => setView('integrations')}>
                Business Integrations
              </button>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                background: isRealMongo ? 'rgba(16, 185, 129, 0.08)' : 'rgba(212, 175, 55, 0.08)', 
                color: isRealMongo ? '#10b981' : 'var(--primary)', 
                border: `1px solid ${isRealMongo ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-color)'}`, 
                padding: '6px 14px', 
                borderRadius: '20px', 
                fontSize: '0.72rem', 
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                letterSpacing: '0.04em'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isRealMongo ? '#10b981' : 'var(--primary)',
                  boxShadow: isRealMongo ? '0 0 8px #10b981' : '0 0 8px var(--primary)'
                }}></span>
                {isRealMongo ? 'MONGO ATLAS LIVE' : 'LOCAL SANDBOX DB'}
              </span>
            </div>
          </>
        )}
      </header>

      {/* Guest Profile Switcher banner (visible in portals to switch contexts) */}
      {((view === 'guest' && !isGuestViewOnly) || view === 'operator') && (
        <div className="glass-card" style={{ padding: '12px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsla(188, 55%, 38%, 0.03)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-glow)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Reservation Profile</span>
              <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                {guests.find(g => g._id === guestId)?.name || 'Alex Mercer'} ({guestId})
              </strong>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Switch Guest Context:</span>
            <select 
              value={guestId} 
              onChange={(e) => {
                setGuestId(e.target.value);
                setMessages([]); // Clear chat history to represent a fresh session for the new guest
              }}
              style={{
                background: 'var(--slot-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {guests.map(g => (
                <option key={g._id} value={g._id}>{g.name} ({g._id})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Render Landing Page View */}
      {view === 'landing' && (
        <div>
          {/* Hero Section */}
          <div className="landing-hero">
            <h2 className="landing-tagline">Local Experience & Eco-Tourism Coordinator</h2>
            <p className="landing-intro">
              Moving beyond basic text chat. A dedicated local travel agent that actively manages schedules, monitors live weather conditions, automatically proposes indoor reschedules during storms, and commits verified transactions directly to MongoDB Atlas.
            </p>
          </div>

          {/* Role selection Cards */}
          <div className="role-selector-grid">
            <div className="glass-card role-card">
              <div className="role-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="role-title">Guest Portal</h3>
              <p className="role-desc">
                Log in as a tourist in paradise. View your custom stay timeline, message the local concierge in real-time, instantly approve weather reschedule cards, and print your official travel itinerary receipt.
              </p>
              <button className="btn-primary" onClick={() => setView('guest')}>
                Enter Guest Portal
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

            <div className="glass-card role-card">
              <div className="role-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h3 className="role-title">Operator Console</h3>
              <p className="role-desc">
                Hotel and lodge logistics management. Trigger custom weather changes, review current calendar listings, and inspect the real-time agent log console to view underlying MCP execution sequences.
              </p>
              <button className="btn-primary" onClick={() => setView('operator')}>
                Enter Operator Dashboard
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>

          {/* Benefits List */}
          <div className="landing-features">
            <h3 className="section-title">Key Capabilities</h3>
            <div className="features-grid">
              <div className="glass-card feature-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="feature-icon-wrapper">
                    <svg width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22c1-4 1-8 0-12" />
                      <path d="M5 22c2-.5 12-.5 14 0" />
                      <path d="M12 10c-3-2-7-1-9 2" />
                      <path d="M12 10c3-2 7-1 9 2" />
                      <path d="M12 10c-4 .5-8 3-9 7" />
                      <path d="M12 10c4 .5 8 3 9 7" />
                      <path d="M12 10c-1.5-4-5-6-8-6" />
                      <path d="M12 10c1.5-4 5-6 8-6" />
                    </svg>
                  </div>
                  <div className="feature-title">Afro-Caribbean Hospitality</div>
                </div>
                <div className="feature-desc">Natural island-hospitable tone using welcoming Creole/Caribbean expressions without sacrificing professional clarity.</div>
              </div>
              <div className="glass-card feature-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="feature-icon-wrapper">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
                      <polyline points="13 11 9 17 12 17 10 23" />
                    </svg>
                  </div>
                  <div className="feature-title">Real-Time Weather Dispatch</div>
                </div>
                <div className="feature-desc">Active alert monitoring. When storms threaten scheduled outdoor bookings, the coordinator triggers replanning pipelines automatically.</div>
              </div>
              <div className="glass-card feature-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="feature-icon-wrapper">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="feature-title">Human-in-the-Loop Safety</div>
                </div>
                <div className="feature-desc">The AI never forces updates. It proposes a swap card, requiring your approval before updating booking documents or capacities.</div>
              </div>
              <div className="glass-card feature-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="feature-icon-wrapper">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5V19c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                    </svg>
                  </div>
                  <div className="feature-title">Live MongoDB Transactions</div>
                </div>
                <div className="feature-desc">Transactions are safely committed back to MongoDB, accurately adjusting available slots and creating official itinerary receipts.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Guest Portal View */}
      {view === 'guest' && (
        <div className="main-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ScheduleView bookings={bookings} tours={tours} logistics={logistics} />
            <ItineraryDoc itineraryMarkdown={itineraryMarkdown} guestId={guestId} />
          </div>
          <div>
            <ChatWidget 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              onRespondProposal={handleRespondProposal} 
              loading={loading}
              bookings={bookings}
              tenantBrand={tenantBrand}
            />
          </div>
        </div>
      )}

      {/* Render Operator Console View */}
      {view === 'operator' && (
        <div className="main-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ScheduleView bookings={bookings} tours={tours} logistics={logistics} />
            
            {/* Onboarding Welcome Flyer Generator */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Guest Onboarding Welcome Cards
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Print a customized 5-star physical onboarding welcome flyer with a custom QR code for checking in guests.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select Checked-In Guest:</span>
                <select 
                  value={welcomeCardGuestId}
                  onChange={(e) => setWelcomeCardGuestId(e.target.value)}
                  style={{
                    background: 'var(--slot-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {guests.map(g => (
                    <option key={g._id} value={g._id}>{g.name} ({g.hotel_name})</option>
                  ))}
                </select>
              </div>

              {/* SaaS B2B Security Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>B2B Security Mode</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {isSecureMode ? 'HMAC-Signed Passwordless Token' : 'Hackathon Demo (Open Access)'}
                  </span>
                </div>
                <button
                  onClick={() => setIsSecureMode(!isSecureMode)}
                  style={{
                    background: isSecureMode ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    color: isSecureMode ? 'hsl(210, 32%, 5%)' : 'var(--text-muted)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'var(--transition)',
                    boxShadow: isSecureMode ? '0 0 10px var(--border-glow)' : 'none'
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isSecureMode ? 'hsl(210, 32%, 5%)' : 'var(--text-dim)',
                    display: 'inline-block'
                  }}></span>
                  {isSecureMode ? 'SECURE ACTIVE' : 'DEMO OPEN'}
                </button>
              </div>

              {/* Flyer Preview Card */}
              {(() => {
                const selectedGuest = guests.find(g => g._id === welcomeCardGuestId) || guests[0];
                if (!selectedGuest) return null;
                const guestDirectLink = isSecureMode && operatorFlyerToken 
                  ? `${window.location.origin}?token=${operatorFlyerToken}` 
                  : `${window.location.origin}?guest_id=${selectedGuest._id}`;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* The Printable Container */}
                    <div className="print-welcome-card-area glass-card" style={{
                      padding: '24px',
                      background: 'linear-gradient(135deg, hsla(210, 32%, 11%, 0.4), hsla(210, 32%, 7%, 0.4))',
                      border: '1px dashed var(--primary)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        {selectedGuest.hotel_name}
                      </span>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>
                        Welcome to Paradise, {selectedGuest.name}!
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.4' }}>
                        Your personalized digital eco-concierge companion is ready. Scan the QR code below using your mobile phone camera to instantly chat with your island companion and customize your itinerary.
                      </p>
                      
                      {/* QR Code Container */}
                      <div style={{
                        background: 'white',
                        padding: '10px',
                        borderRadius: '8px',
                        display: 'inline-block',
                        margin: '6px 0',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
                      }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=0f172b&data=${encodeURIComponent(guestDirectLink)}`} 
                          alt="Onboarding QR Code" 
                          style={{ width: '120px', height: '120px', display: 'block' }}
                        />
                      </div>

                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Customized stay: {selectedGuest.stay_start} to {selectedGuest.stay_end}
                      </span>
                    </div>

                    <button 
                      className="btn-primary" 
                      onClick={() => {
                        window.print();
                      }}
                      style={{ padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print Welcome Card for {selectedGuest.name}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ControlPanel 
              logistics={logistics} 
              onSimulate={handleSimulate} 
              onReset={handleReset} 
              agentLogs={agentLogs} 
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Render Business Integrations View */}
      {view === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="landing-hero" style={{ padding: '30px', marginBottom: '0px' }}>
             <h2 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Enterprise Workflow Integration
             </h2>
            <p className="landing-intro" style={{ fontSize: '0.95rem' }}>
              Connect your Property Management System (PMS), CRM, or booking engine (like Cloudbeds, MEWS, or custom booking pipelines) to the Bocas del Toro Concierge.
            </p>
          </div>

          <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
            {/* Technical Docs */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <h3 style={{ fontSize: '1.15rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                PMS Sync Webhook API Reference
               </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Hotels and eco-lodges can trigger this API endpoint on guest check-in, automatically seeding the digital companion with their custom itinerary and preferences.
              </p>
              
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>POST /api/pms/sync-guest</span>
                <pre style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: 0, fontFamily: 'Courier New, monospace' }}>
{`{
  "guest_id": "g_pms_42",
  "name": "Bruce Wayne",
  "phone": "+1-555-BAT-SIGNAL",
  "preferences": ["adventure", "relaxation"],
  "stay_start": "${new Date().toISOString().split('T')[0]}",
  "stay_end": "${new Date(Date.now() + 259200000).toISOString().split('T')[0]}",
  "notes": "VIP guest from Gotham. Prefers early schedules.",
  "bookings": [
    {
      "tour_id": "t2",
      "date": "${new Date().toISOString().split('T')[0]}",
      "slot": "afternoon",
      "price": 65.0
    }
  ]
}`}
                </pre>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '10px' }}>Integration Benefits:</h4>
              <ul style={{ fontSize: '0.82rem', color: 'var(--text-dim)', paddingLeft: '20px', lineHeight: '1.6' }}>
                <li><strong>No manual entry:</strong> Bookings flow automatically from the front desk into the guest portal.</li>
                <li><strong>Proactive Dispatching:</strong> The agent monitors live weather and notifies front-desk agents / guest phones instantly of recommended changes.</li>
                <li><strong>Printed Receipts with Deep Link QRs:</strong> Print checkout receipts displaying dynamic QR codes linking back to their customized portal.</li>
              </ul>
            </div>

            {/* Simulated Live Injector */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <h3 style={{ fontSize: '1.15rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0 }}>
                  <path d="M10 2v7.31a2.5 2 0 0 1-.73 1.77l-4.54 4.54a4.5 4.5 0 0 0 6.36 6.36l4.54-4.54a2.5 2.5 0 0 1 1.77-.73H14V2z" />
                  <line x1="8.5" y1="2" x2="15.5" y2="2" />
                </svg>
                Simulate PMS Webhook Trigger
               </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Trigger a mock check-in and booking synchronization to verify how real-world hotels feed reservation payloads directly into the live MongoDB Atlas.
              </p>

              <button 
                className="btn-primary"
                disabled={loading}
                onClick={() => handlePMSSync({
                  guest_id: "g_pms_99",
                  name: "John Wick",
                  phone: "+1-212-CONTINENTAL",
                  preferences: ["relaxation", "indoor"],
                  stay_start: new Date().toISOString().split('T')[0],
                  stay_end: new Date(Date.now() + 259200000).toISOString().split('T')[0],
                  notes: "Traveling with a dog. Requires premium overwater spa decks.",
                  bookings: [
                    {
                      tour_id: "t6",
                      date: new Date().toISOString().split('T')[0],
                      slot: "morning",
                      price: 75.0
                    }
                  ]
                })}
                style={{ padding: '12px', width: '100%' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Sync Check-in payload for "John Wick"
              </button>

              <button 
                className="btn-secondary"
                disabled={loading}
                onClick={() => handlePMSSync({
                  guest_id: "g_pms_100",
                  name: "Lara Croft",
                  phone: "+44-20-TOMB-RAIDER",
                  preferences: ["adventure", "wildlife"],
                  stay_start: new Date().toISOString().split('T')[0],
                  stay_end: new Date(Date.now() + 259200000).toISOString().split('T')[0],
                  notes: "Enjoys extreme ziplining and cave explorations.",
                  bookings: [
                    {
                      tour_id: "t2",
                      date: new Date().toISOString().split('T')[0],
                      slot: "afternoon",
                      price: 65.0
                    }
                  ]
                })}
                style={{ padding: '12px', width: '100%' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Sync Check-in payload for "Lara Croft"
              </button>

              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--primary)', paddingLeft: '10px' }}>
                <strong>How to test:</strong> Click a button to simulate a check-in. The app will immediately ingest the guest, populate bookings in MongoDB, auto-generate their initial itinerary markdown, clear the ADK session, and switch you directly to the active guest's companion view.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium responsive Itinerary updated modal/popup */}
      {showItineraryModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            .modal-content-wrapper {
              animation: modalFadeIn 0.3s ease;
            }
            @media (max-width: 768px) {
              .modal-grid {
                grid-template-columns: 1fr !important;
                max-height: 95vh !important;
              }
              .modal-left {
                border-right: none !important;
                border-bottom: 1px solid var(--border-color) !important;
                padding: 20px !important;
              }
              .modal-right {
                padding: 20px !important;
              }
            }
          `}} />
          <div className="modal-content-wrapper modal-grid" style={{
            position: 'relative',
            width: '100%',
            maxWidth: '850px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            overflow: 'hidden',
            maxHeight: '90vh'
          }}>
            {/* Left side: QR Code, Action, Congrats badge */}
            <div className="modal-left" style={{
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '20px',
              borderRight: '1px solid var(--border-color)',
              background: 'hsla(188, 86%, 50%, 0.03)'
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-glow)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '8px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>Itinerary Updated!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', margin: 0 }}>
                Your activities have been successfully updated in MongoDB. Scan the QR code below to save your new itinerary directly onto your phone!
              </p>
              
              {/* QR Code Container */}
              <div style={{
                background: 'white',
                padding: '12px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                display: 'inline-block'
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0f172b&data=${encodeURIComponent(
                    token 
                      ? `${window.location.origin}?token=${token}` 
                      : `${window.location.origin}?guest_id=${guestId}`
                  )}`} 
                  alt="Scan QR Code to save on phone" 
                  style={{ width: '150px', height: '150px', display: 'block' }}
                />
              </div>
              
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 550 }}>
                Scan to save to your phone
              </span>

              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => window.print()}
                  style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print Receipt
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowItineraryModal(false)}
                  style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem' }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Right side: Interactive Scrollable ItineraryDoc rendering */}
            <div className="modal-right" style={{
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              maxHeight: '90vh'
            }}>
              <ItineraryDoc itineraryMarkdown={itineraryMarkdown} guestId={guestId} />
            </div>

            {/* Absolute Close X Icon */}
            <button 
              onClick={() => setShowItineraryModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem',
                transition: 'all 0.2s ease',
                zIndex: 10001
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
