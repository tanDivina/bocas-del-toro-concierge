import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import ScheduleView from './components/ScheduleView';
import ChatWidget from './components/ChatWidget';
import ControlPanel from './components/ControlPanel';
import ItineraryDoc from './components/ItineraryDoc';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : window.location.origin;

// Synchronously parse query parameters to prevent mount-time state transitions and race conditions
const getInitialParams = () => {
  if (typeof window === 'undefined') {
    return { view: 'landing', guestId: 'g1', token: null, secureActive: false, guestViewOnly: false };
  }
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  const urlGuestId = params.get('guest_id');
  const urlView = params.get('view');
  
  if (urlToken) {
    return { view: 'guest', guestId: 'g1', token: urlToken, secureActive: true, guestViewOnly: true };
  } else if (urlGuestId) {
    return { view: 'guest', guestId: urlGuestId, token: null, secureActive: false, guestViewOnly: true };
  } else if (urlView && ['landing', 'guest', 'operator', 'integrations'].includes(urlView)) {
    return { view: urlView, guestId: 'g1', token: null, secureActive: false, guestViewOnly: false };
  }
  return { view: 'landing', guestId: 'g1', token: null, secureActive: false, guestViewOnly: false };
};

const initialParams = getInitialParams();

// Map of standard tenant brand configurations for instantaneous operator design system previews
const tenantBrandsMock = {
  hotel_nayara: {
    name: "Nayara Bocas del Toro",
    primary_color: "hsl(188, 86%, 38%)",
    primary_glow: "rgba(15, 186, 211, 0.12)",
    font: "Inter, system-ui, sans-serif",
    welcome_message: "Your luxury overwater villa experience begins now. Pura vida! 🌴",
    theme: "theme-ocean"
  },
  hotel_lacoralina: {
    name: "La Coralina Island House",
    primary_color: "hsl(45, 60%, 55%)",
    primary_glow: "rgba(212, 175, 55, 0.12)",
    font: "var(--font-serif), Georgia, serif",
    welcome_message: "Welcome to your Balinese wellness sanctuary in the Caribbean. Pura vida! 🌸",
    theme: "theme-wellness"
  },
  hotel_sweetbocas: {
    name: "Sweet Bocas",
    primary_color: "hsl(330, 75%, 45%)",
    primary_glow: "rgba(219, 39, 119, 0.12)",
    font: "Outfit, Poppins, system-ui, sans-serif",
    welcome_message: "Step into absolute, sustainable luxury on our private island estate. Respect! 🌺",
    theme: "theme-hibiscus"
  },
  hotel_bocasvillas: {
    name: "Bocas Luxury Villas",
    primary_color: "hsl(150, 65%, 35%)",
    primary_glow: "rgba(34, 197, 94, 0.12)",
    font: "Roboto, system-ui, sans-serif",
    welcome_message: "Your boutique cliffside eco-villa retreat is ready, my friend. No stress! 🦜",
    theme: "theme-forest"
  },
  hotel_redfrog: {
    name: "Red Frog Beach Resort",
    primary_color: "hsl(15, 85%, 50%)",
    primary_glow: "rgba(249, 115, 22, 0.12)",
    font: "Poppins, Inter, system-ui, sans-serif",
    welcome_message: "Welcome to our vibrant beachfront jungle playground. Pura vida! 🐸",
    theme: "theme-volcano"
  }
};

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
  const [guestId, setGuestId] = useState(initialParams.guestId);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [isGuestViewOnly, setIsGuestViewOnly] = useState(initialParams.guestViewOnly);
  const [welcomeCardGuestId, setWelcomeCardGuestId] = useState(initialParams.guestId);
  const [token, setToken] = useState(initialParams.token);
  const [tenantBrand, setTenantBrand] = useState(null);
  const [tenantsList, setTenantsList] = useState([]);
  const [extractionUrl, setExtractionUrl] = useState('');
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [isSecureModeActive, setIsSecureModeActive] = useState(initialParams.secureActive);
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [operatorFlyerToken, setOperatorFlyerToken] = useState('');
  const lastGuestIdRef = React.useRef(null);
  const lastRequestRef = React.useRef(0);

  const [view, setView] = useState(initialParams.view);

  // States & Refs for resilient custom dropdown menus
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const guestDropdownRef = React.useRef(null);
  const [flyerDropdownOpen, setFlyerDropdownOpen] = useState(false);
  const flyerDropdownRef = React.useRef(null);

  // Transition Helper for silky same-document view morphs using React 19 flushSync
  const transitionState = (updateFn) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(updateFn);
      });
    } else {
      updateFn();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target)) {
        setGuestDropdownOpen(false);
      }
      if (flyerDropdownRef.current && !flyerDropdownRef.current.contains(event.target)) {
        setFlyerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Unified navigation router to clear secure view-only session locks when exiting Guest Portal context
  const navigateToView = (newView) => {
    transitionState(() => {
      if (newView !== 'guest') {
        setToken(null);
        setIsSecureModeActive(false);
        setIsGuestViewOnly(false);
      }
      setView(newView);
    });
  };

  // Manual Check-in Form States
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualHotel, setManualHotel] = useState('hotel_lacoralina');
  const [manualStayStart, setManualStayStart] = useState(new Date().toISOString().split('T')[0]);
  const [manualStayEnd, setManualStayEnd] = useState(new Date(Date.now() + 259200000).toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState('');
  const [manualPreferences, setManualPreferences] = useState([]);
  const [manualBookings, setManualBookings] = useState([]);
  const [integrationTab, setIntegrationTab] = useState('manual'); // 'manual' or 'webhook'

  const handleManualCheckInSubmit = (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) {
      alert("Please enter the guest's name and phone number.");
      return;
    }
    
    // Generate a unique, recognizable ID for manual check-ins
    const timestamp = Date.now().toString().slice(-6);
    const randomPart = Math.floor(100 + Math.random() * 900);
    const guestIdGenerated = `g_manual_${timestamp}_${randomPart}`;
    
    // Get hotel name based on hotel_id
    const hotelNamesMap = {
      'hotel_nayara': 'Nayara Bocas del Toro',
      'hotel_lacoralina': 'La Coralina Island House',
      'hotel_sweetbocas': 'Sweet Bocas',
      'hotel_bocasvillas': 'Bocas Luxury Villas',
      'hotel_redfrog': 'Red Frog Beach Resort'
    };
    const foundTenant = tenantsList.find(t => t._id === manualHotel);
    const hotelNameSelected = foundTenant ? foundTenant.name : (hotelNamesMap[manualHotel] || 'La Coralina Island House');

    // Prepare payload
    const payload = {
      guest_id: guestIdGenerated,
      name: manualName,
      phone: manualPhone,
      preferences: manualPreferences,
      stay_start: manualStayStart,
      stay_end: manualStayEnd,
      notes: manualNotes,
      hotel_id: manualHotel,
      hotel_name: hotelNameSelected,
      bookings: manualBookings
    };

    // Sync via existing PMS sync function
    handlePMSSync(payload);

    // Reset manual form fields
    setManualName('');
    setManualPhone('');
    setManualNotes('');
    setManualPreferences([]);
    setManualBookings([]);
  };

  const handleExtractBrand = async () => {
    if (!extractionUrl.trim()) return;
    setLoadingBrand(true);
    addLog(`✨ Calling AI Brand Extractor endpoint with URL: ${extractionUrl}`);
    try {
      const res = await fetch(`${API_BASE}/api/tenant/extract-brand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extractionUrl })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Brand extraction endpoint error.");
      }
      const data = await res.json();
      if (data.success && data.tenant_brand) {
        addLog(`🟢 Successfully brand-onboarded ${data.tenant_brand.name}! Generated theme: ${data.tenant_brand.theme}`);
        
        // Add or update in tenantsList
        setTenantsList(prev => {
          const filtered = prev.filter(t => t._id !== data.tenant_brand._id);
          return [...filtered, data.tenant_brand];
        });
        
        // Automatically select the newly created hotel!
        setManualHotel(data.tenant_brand._id);
        setExtractionUrl('');
      } else {
        throw new Error(data.message || "Failed to extract brand identity.");
      }
    } catch (err) {
      console.error("Error in brand extraction:", err);
      addLog(`❌ Brand Extraction Failed: ${err.message}`);
      alert(`Brand onboarding failed: ${err.message}`);
    } finally {
      setLoadingBrand(false);
    }
  };

  const handleDeleteHotel = async (hotelId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this custom hotel? This will delete its brand design system from the database.")) {
      return;
    }
    
    addLog(`✨ Removing custom hotel brand: ${hotelId}`);
    try {
      const res = await fetch(`${API_BASE}/api/tenant/${hotelId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setTenantsList(prev => prev.filter(t => t._id !== hotelId));
        addLog(`🟢 Custom hotel brand '${hotelId}' removed successfully from DB.`);
        if (manualHotel === hotelId) {
          setManualHotel("hotel_lacoralina");
        }
      } else {
        throw new Error(data.detail || "Failed to delete hotel.");
      }
    } catch (err) {
      console.error("Error in hotel deletion:", err);
      addLog(`❌ Hotel Deletion Failed: ${err.message}`);
      alert(`Hotel removal failed: ${err.message}`);
    }
  };

  // Custom Tour Register Form States
  const [customTourName, setCustomTourName] = useState('');
  const [customTourType, setCustomTourType] = useState('outdoor');
  const [customTourDesc, setCustomTourDesc] = useState('');
  const [customTourPrice, setCustomTourPrice] = useState('50.0');
  const [customTourSlots, setCustomTourSlots] = useState(['morning', 'afternoon']);
  const [customTourCapacity, setCustomTourCapacity] = useState('10');
  const [customTourLocation, setCustomTourLocation] = useState('Bocas del Toro');

  const handleCustomTourSubmit = async (e) => {
    e.preventDefault();
    if (!customTourName.trim()) {
      alert("Please enter a name for the custom excursion.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/operator/add-tour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customTourName,
          type: customTourType,
          description: customTourDesc,
          price: parseFloat(customTourPrice) || 0.0,
          slots: customTourSlots,
          capacity: parseInt(customTourCapacity) || 10,
          location: customTourLocation
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Custom excursion successfully added to MongoDB!");
        setCustomTourName('');
        setCustomTourDesc('');
        setCustomTourPrice('50.0');
        setCustomTourSlots(['morning', 'afternoon']);
        setCustomTourCapacity('10');
        setCustomTourLocation('Bocas del Toro');
        
        // Refresh status list
        fetchStatus(guestId);
      } else {
        alert(`Failed to add custom excursion: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error adding custom tour:", err);
      alert(`Network error adding excursion: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 1. Load initial status from token if active, isolated to token changes only to prevent switching loops
  useEffect(() => {
    if (token) {
      fetchStatus(null, token);
    }
  }, [token]);

  // 2. Load initial status from guestId if token is null (e.g. open sandbox switcher)
  useEffect(() => {
    if (!token && guestId !== lastGuestIdRef.current) {
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
    const requestId = ++lastRequestRef.current;
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
      
      // Ignore stale responses to eliminate network race conditions and infinite loops
      if (requestId !== lastRequestRef.current) {
        return;
      }
      
      transitionState(() => {
        setBookings(data.bookings || []);
        setTours(data.tours || []);
        setLogistics(data.logistics || []);
        setGuests(data.guests || []);
        setTenantBrand(data.tenant_brand || null);
        setTenantsList(data.tenants || []);
        
        if (data.guest_id) {
          if (data.guest_id !== guestId) {
            setMessages([]); // Clear chat history to represent a fresh session for the new guest
          }
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
      });
    } catch (error) {
      console.error("Error fetching status:", error);
      addLog(`❌ Server Error: ${error.message}. Is the backend running on port 8000?`);
    }
  };

  // Dynamic Live Theme Engine (overrides both documentElement and body for CSS specificity)
  useEffect(() => {
    const activeBrand = tenantBrand;

    const targets = [document.documentElement, document.body];

    if (activeBrand) {
      targets.forEach(target => {
        target.style.setProperty('--primary', activeBrand.primary_color);
        target.style.setProperty('--primary-glow', activeBrand.primary_glow);
        
        if (activeBrand.font) {
          target.style.setProperty('--font-sans', activeBrand.font);
        }
        
        if (activeBrand.primary_color && activeBrand.primary_color.includes('hsl')) {
          const colorValue = activeBrand.primary_color.replace('hsl(', '').replace(')', '');
          target.style.setProperty('--border-color', `hsla(${colorValue}, 0.16)`);
          target.style.setProperty('--border-glow', `hsla(${colorValue}, 0.35)`);
          target.style.setProperty('--msg-user-bg', `hsla(${colorValue}, 0.1)`);
          target.style.setProperty('--msg-agent-bg', `${activeBrand.primary_glow}`);
        }
      });

      // Dynamically morph browser tab favicon to match selected hotel brand design system
      if (activeBrand.primary_color) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.type = 'image/svg+xml';
        
        const brandColor = activeBrand.primary_color;
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22c1-4 1-8 0-12" />
          <path d="M5 22c2-.5 12-.5 14 0" />
          <path d="M12 10c-3-2-7-1-9 2" />
          <path d="M12 10c3-2 7-1 9 2" />
          <path d="M12 10c-4 .5-8 3-9 7" />
          <path d="M12 10c4 .5 8 3 9 7" />
          <path d="M12 10c-1.5-4-5-6-8-6" />
          <path d="M12 10c1.5-4 5-6 8-6" />
        </svg>`;
        link.href = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
      }
    } else {
      targets.forEach(target => {
        target.style.removeProperty('--primary');
        target.style.removeProperty('--primary-glow');
        target.style.removeProperty('--font-sans');
        target.style.removeProperty('--border-color');
        target.style.removeProperty('--border-glow');
        target.style.removeProperty('--msg-user-bg');
        target.style.removeProperty('--msg-agent-bg');
      });
    }
  }, [tenantBrand, view, integrationTab, manualHotel, tenantsList]);

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

  const currentActiveBrand = tenantBrand;

  return (
    <div className="app-container">
      {/* Premium Header with Navigation */}
      <header className="app-header">
        {isGuestViewOnly ? (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h1 className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', color: 'var(--primary)' }}>
                {currentActiveBrand?.logo_url ? (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '1.5px solid var(--primary)',
                    boxShadow: '0 0 10px var(--primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)',
                    flexShrink: 0
                  }}>
                    <img 
                      src={currentActiveBrand.logo_url} 
                      alt={currentActiveBrand.name || 'Brand Logo'} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.style.border = 'none';
                          parent.style.boxShadow = 'none';
                          parent.style.background = 'none';
                          parent.innerHTML = `
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary)">
                              <path d="M12 22c1-4 1-8 0-12"></path>
                              <path d="M5 22c2-.5 12-.5 14 0"></path>
                              <path d="M12 10c-3-2-7-1-9 2"></path>
                              <path d="M12 10c3-2 7-1 9 2"></path>
                              <path d="M12 10c-4 .5-8 3-9 7"></path>
                              <path d="M12 10c4 .5 8 3 9 7"></path>
                              <path d="M12 10c-1.5-4-5-6-8-6"></path>
                              <path d="M12 10c1.5-4 5-6 8-6"></path>
                            </svg>
                          `;
                        }
                      }}
                    />
                  </div>
                ) : (
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
                )}
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
              <h1 className="app-title" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => navigateToView('landing')}>
                {currentActiveBrand?.logo_url ? (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '1.5px solid var(--primary)',
                    boxShadow: '0 0 10px var(--primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)',
                    flexShrink: 0
                  }}>
                    <img 
                      src={currentActiveBrand.logo_url} 
                      alt={currentActiveBrand.name || 'Brand Logo'} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.style.border = 'none';
                          parent.style.boxShadow = 'none';
                          parent.style.background = 'none';
                          parent.innerHTML = `
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary)">
                              <path d="M12 22c1-4 1-8 0-12"></path>
                              <path d="M5 22c2-.5 12-.5 14 0"></path>
                              <path d="M12 10c-3-2-7-1-9 2"></path>
                              <path d="M12 10c3-2 7-1 9 2"></path>
                              <path d="M12 10c-4 .5-8 3-9 7"></path>
                              <path d="M12 10c4 .5 8 3 9 7"></path>
                              <path d="M12 10c-1.5-4-5-6-8-6"></path>
                              <path d="M12 10c1.5-4 5-6 8-6"></path>
                            </svg>
                          `;
                        }
                      }}
                    />
                  </div>
                ) : (
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
                )}
                Bocas del Toro Concierge
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Local Experience & Eco-Tourism Coordinator
              </p>
            </div>

            {/* Navigation Tabs */}
            <nav className="nav-links">
              <button className={`nav-link ${view === 'landing' ? 'active' : ''}`} onClick={() => navigateToView('landing')}>
                Home / About
              </button>
              <button className={`nav-link ${view === 'guest' ? 'active' : ''}`} onClick={() => navigateToView('guest')}>
                Guest Portal
              </button>
              <button className={`nav-link ${view === 'operator' ? 'active' : ''}`} onClick={() => navigateToView('operator')}>
                Operator Console
              </button>
              <button className={`nav-link ${view === 'integrations' ? 'active' : ''}`} onClick={() => navigateToView('integrations')}>
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
        <div style={{ 
          padding: '14px 20px', 
          marginBottom: '20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--panel-bg)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-glow)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Switch Guest Context:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {guests.map(g => {
                const isActive = g._id === guestId;
                return (
                  <button
                    key={g._id}
                    onClick={() => {
                      setToken(null);
                      setIsSecureModeActive(false);
                      setIsGuestViewOnly(false);
                      setGuestId(g._id);
                      setMessages([]);
                      setBookings([]);
                      setItineraryMarkdown('');
                    }}
                    style={{
                      background: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.02)',
                      color: isActive ? '#000' : 'var(--text-primary)',
                      border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      borderRadius: '30px',
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isActive ? '0 4px 12px var(--primary-glow)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: isActive ? 'rgba(0, 0, 0, 0.2)' : 'var(--primary-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.62rem',
                      color: isActive ? '#000' : 'var(--primary)',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      flexShrink: 0
                    }}>
                      {g.name ? g.name[0] : 'G'}
                    </div>
                    <span>{g.name}</span>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      color: isActive ? 'rgba(0, 0, 0, 0.5)' : 'var(--text-muted)',
                      fontWeight: 500
                    }}>
                      {g._id}
                    </span>
                  </button>
                );
              })}
            </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', viewTransitionName: 'schedule-view' }}>
            <ScheduleView bookings={bookings} tours={tours} logistics={logistics} guestId={guestId} />
            <ItineraryDoc itineraryMarkdown={itineraryMarkdown} guestId={guestId} />
          </div>
          <div style={{ viewTransitionName: 'chat-widget' }}>
            <ChatWidget 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              onRespondProposal={handleRespondProposal} 
              loading={loading}
              bookings={bookings}
              tenantBrand={tenantBrand}
              tours={tours}
              logistics={logistics}
            />
          </div>
        </div>
      )}

      {/* Render Operator Console View */}
      {view === 'operator' && (
        <div className="main-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', viewTransitionName: 'schedule-view' }}>
            <ScheduleView bookings={bookings} tours={tours} logistics={logistics} guestId={guestId} />
            
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
                <div className="custom-dropdown-container" ref={flyerDropdownRef}>
                  <button 
                    onClick={() => setFlyerDropdownOpen(!flyerDropdownOpen)}
                    className={`custom-dropdown-trigger ${flyerDropdownOpen ? 'active' : ''}`}
                    style={{
                      background: 'var(--slot-bg)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{guests.find(g => g._id === welcomeCardGuestId)?.name || 'Select Guest'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: flyerDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: 'var(--primary)' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {flyerDropdownOpen && (
                    <div className="custom-dropdown-menu" style={{ left: 0, right: 'auto', transformOrigin: 'top left', positionAnchor: '--flyer-dropdown-anchor' }}>
                      <div style={{ padding: '8px 12px', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                        Checked-In Guests
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {guests.map(g => (
                          <button
                            key={g._id}
                            onClick={() => {
                              transitionState(() => {
                                setWelcomeCardGuestId(g._id);
                              });
                              setFlyerDropdownOpen(false);
                            }}
                            style={{
                              background: g._id === welcomeCardGuestId ? 'var(--primary-glow)' : 'transparent',
                              color: g._id === welcomeCardGuestId ? 'var(--primary)' : 'var(--text-primary)',
                              border: 'none',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (g._id !== welcomeCardGuestId) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                e.currentTarget.style.color = 'var(--primary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (g._id !== welcomeCardGuestId) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }
                            }}
                          >
                            <span style={{ fontWeight: g._id === welcomeCardGuestId ? 600 : 400 }}>{g.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{g.hotel_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', viewTransitionName: 'control-panel' }}>
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
          {/* Hero Section */}
          <div className="landing-hero" style={{ padding: '30px', marginBottom: '0px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <h2 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Enterprise Workflow & Front Desk Portal
             </h2>
            <p className="landing-intro" style={{ fontSize: '0.95rem', margin: 0 }}>
              Onboard guests, generate digital itineraries, and print welcome cards. Support both local manual operations and zero-code automated PMS integrations (like Cloudbeds, MEWS, or custom engines).
            </p>
          </div>

          {/* Premium Sub-Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', paddingBottom: '4px' }}>
            <button 
              onClick={() => setIntegrationTab('manual')}
              style={{
                background: integrationTab === 'manual' ? 'var(--primary-glow)' : 'transparent',
                border: 'none',
                borderBottom: integrationTab === 'manual' ? '3px solid var(--primary)' : '3px solid transparent',
                color: integrationTab === 'manual' ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
              Simple Check-In Portal (No PMS)
            </button>
            <button 
              onClick={() => setIntegrationTab('webhook')}
              style={{
                background: integrationTab === 'webhook' ? 'var(--primary-glow)' : 'transparent',
                border: 'none',
                borderBottom: integrationTab === 'webhook' ? '3px solid var(--primary)' : '3px solid transparent',
                color: integrationTab === 'webhook' ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Real-time Webhooks & API
            </button>
            <button 
              onClick={() => setIntegrationTab('custom_tours')}
              style={{
                background: integrationTab === 'custom_tours' ? 'var(--primary-glow)' : 'transparent',
                border: 'none',
                borderBottom: integrationTab === 'custom_tours' ? '3px solid var(--primary)' : '3px solid transparent',
                color: integrationTab === 'custom_tours' ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Register Custom Tours
            </button>
          </div>

          {/* Sub-Tab 1: Manual Front Desk Check-In Portal */}
          {integrationTab === 'manual' && (
            <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Interactive Manual Form Card */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Manual Guest Check-In Form
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    For local overwater lodges, boutique stays, and tour operators with manual reservation books. Register check-ins live into your MongoDB Atlas cluster.
                  </p>
                </div>

                <form onSubmit={handleManualCheckInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Two Column Grid: Name and Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Guest Full Name *
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Michael Jordan"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        style={{
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Phone Number *
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. +1-555-0199"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        style={{
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                    </div>
                  </div>

                  {/* Resort Option Cards Grid */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
                      Resort Property (Tenant Brand)
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '12px',
                      marginTop: '4px'
                    }}>
                      {[
                        ...Object.entries(tenantBrandsMock).map(([id, b]) => ({ _id: id, ...b })),
                        ...tenantsList.filter(t => !tenantBrandsMock[t._id])
                      ].map(hotel => {
                        const isSelected = manualHotel === hotel._id;
                        const accentColor = hotel.primary_color;
                        const previewGlow = hotel.primary_glow || 'rgba(255,255,255,0.05)';
                        
                        return (
                          <div
                            key={hotel._id}
                            onClick={() => setManualHotel(hotel._id)}
                            style={{
                              background: isSelected ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)',
                              border: '2px solid',
                              borderColor: isSelected ? accentColor : 'var(--border-color)',
                              borderRadius: '12px',
                              padding: '14px',
                              cursor: 'pointer',
                              transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              position: 'relative',
                              boxShadow: isSelected ? `0 0 15px ${previewGlow}` : 'none',
                              transform: isSelected ? 'scale(1.02)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1.5px solid',
                                borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)',
                                boxShadow: isSelected ? `0 0 10px ${accentColor}` : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                transition: 'all 0.25s'
                              }}>
                                {hotel.logo_url ? (
                                  <img 
                                    src={hotel.logo_url} 
                                    alt={hotel.name} 
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover' 
                                    }} 
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.parentElement.innerHTML = `<span style="font-size: 0.8rem; font-weight: 800; color: ${accentColor}">${hotel.name.charAt(0)}</span>`;
                                    }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: accentColor }}>
                                    {hotel.name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Delete Button (Only for custom onboarded hotels) */}
                                {!tenantBrandsMock[hotel._id] && (
                                  <button
                                    onClick={(e) => handleDeleteHotel(hotel._id, e)}
                                    title="Delete custom hotel"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-dim)',
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.85rem',
                                      fontWeight: 'bold',
                                      transition: 'all 0.2s',
                                      zIndex: 10
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                    onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}
                                  >
                                    ✕
                                  </button>
                                )}
                                
                                {/* Selection Indicator Check */}
                                {isSelected && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 650, color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {hotel.name}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {hotel.font ? hotel.font.split(',')[0] : 'Inter'}
                              </span>
                            </div>

                            {/* Decorative Corner Glow */}
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: '30px',
                                height: '30px',
                                background: accentColor,
                                filter: 'blur(20px)',
                                opacity: 0.3,
                                pointerEvents: 'none'
                              }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Two Column Grid: Arrival & Departure */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Check-In Date
                      </label>
                      <input 
                        type="date" 
                        value={manualStayStart}
                        onChange={(e) => setManualStayStart(e.target.value)}
                        style={{
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Check-Out Date
                      </label>
                      <input 
                        type="date" 
                        value={manualStayEnd}
                        onChange={(e) => setManualStayEnd(e.target.value)}
                        style={{
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                    </div>
                  </div>

                  {/* Preferences / Tags */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Guest Vibe / Travel Styles
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {['adventure', 'relaxation', 'wellness', 'wildlife', 'culture', 'indoor'].map(tag => {
                        const isSelected = manualPreferences.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setManualPreferences(prev => prev.filter(t => t !== tag));
                              } else {
                                setManualPreferences(prev => [...prev, tag]);
                              }
                            }}
                            style={{
                              background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                              border: '1px solid',
                              borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                              color: isSelected ? '#0f172a' : 'var(--text-muted)',
                              padding: '6px 12px',
                              borderRadius: '16px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              textTransform: 'capitalize'
                            }}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes & Special Requests */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Front-Desk Notes / Special Requests (Optional)
                    </label>
                    <textarea 
                      placeholder="e.g. Honeymoon couple. Enjoys early mornings. Prefers overwater massage decks."
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      rows={2}
                      style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        fontSize: '0.88rem',
                        outline: 'none',
                        width: '100%',
                        resize: 'none',
                        fontFamily: 'var(--font-sans)'
                      }}
                    />
                  </div>

                  {/* Pre-Booked Activities */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', margin: 0 }}>
                      Pre-Booked Excursions & Spa (Check to include in itinerary)
                    </label>
                    <div style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {tours.map(tour => {
                        const isChecked = manualBookings.some(b => b.tour_id === tour._id);
                        const bookingDetail = manualBookings.find(b => b.tour_id === tour._id);
                        return (
                          <div key={tour._id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input 
                                type="checkbox"
                                id={`chk-${tour._id}`}
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setManualBookings(prev => [...prev, {
                                      tour_id: tour._id,
                                      date: manualStayStart,
                                      slot: tour.slots?.[0] || 'morning',
                                      price: tour.price || 0.0
                                    }]);
                                  } else {
                                    setManualBookings(prev => prev.filter(b => b.tour_id !== tour._id));
                                  }
                                }}
                                style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '15px', height: '15px' }}
                              />
                              <label htmlFor={`chk-${tour._id}`} style={{ fontSize: '0.82rem', fontWeight: 550, cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{tour.name}</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>${tour.price}</span>
                              </label>
                            </div>

                            {isChecked && bookingDetail && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginLeft: '22px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px' }}>
                                <div>
                                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Excursion Date</label>
                                  <input 
                                    type="date"
                                    min={manualStayStart}
                                    max={manualStayEnd}
                                    value={bookingDetail.date}
                                    onChange={(e) => {
                                      const dVal = e.target.value;
                                      setManualBookings(prev => prev.map(b => b.tour_id === tour._id ? { ...b, date: dVal } : b));
                                    }}
                                    style={{
                                      background: '#090d16',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)',
                                      padding: '4px 6px',
                                      fontSize: '0.74rem',
                                      width: '100%'
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Time Slot</label>
                                  <select
                                    value={bookingDetail.slot}
                                    onChange={(e) => {
                                      const sVal = e.target.value;
                                      setManualBookings(prev => prev.map(b => b.tour_id === tour._id ? { ...b, slot: sVal } : b));
                                    }}
                                    style={{
                                      background: '#090d16',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)',
                                      padding: '4px 6px',
                                      fontSize: '0.74rem',
                                      width: '100%',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {(tour.slots || ['morning', 'afternoon']).map(s => (
                                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ padding: '12px', width: '100%', marginTop: '8px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Check In Guest & Generate Digital Portal
                  </button>

                </form>
              </div>

              {/* Dynamic Welcome Card Live Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid var(--primary)', background: 'hsla(38, 45%, 60%, 0.02)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Live Welcome Card Preview
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    This is a live mockup of the physical welcome flyer automatically generated upon check-in. Put this in your guest's welcome envelope or print it directly!
                  </p>

                  {/* Simulated Card Block */}
                  <div style={{
                    background: 'var(--bg-color)',
                    border: '1px dashed var(--primary)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '14px',
                    position: 'relative'
                  }}>
                    {/* Tiny Ribbon */}
                    <div style={{
                      position: 'absolute',
                      top: '12px', right: '12px',
                      background: 'var(--primary-glow)',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em'
                    }}>
                      ISLANDFLOW COMPANION
                    </div>

                    <h5 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 0 0', fontFamily: 'var(--font-serif)', color: 'var(--primary)' }}>
                      {manualName ? manualName : "Guest Full Name"}
                    </h5>
                    
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '280px', margin: 0, lineHeight: '1.4' }}>
                      Welcome to <strong>{([ ...Object.entries(tenantBrandsMock).map(([id, b]) => ({ _id: id, ...b })), ...tenantsList ]).find(h => h._id === manualHotel)?.name || 'La Coralina Island House'}</strong>. Scan this QR code to unlock your personalized, weather-intelligent eco-concierge companion.
                    </p>

                    <div style={{
                      background: 'white',
                      padding: '8px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      display: 'inline-block'
                    }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=0f172b&data=${encodeURIComponent(window.location.origin + "?guest_id=" + (manualName ? "g_manual_preview" : "g_placeholder"))}`} 
                        alt="Onboarding QR Code" 
                        style={{ width: '100px', height: '100px', display: 'block', opacity: manualName ? 1 : 0.4 }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 650 }}>
                        Scan to Access Your Itinerary
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Custom stay: {manualStayStart} to {manualStayEnd}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'start', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span><strong>Upon submission:</strong> This guest will be recorded in MongoDB, a secure magic-link QR will generate, and you will be automatically redirected to their personalized dashboard.</span>
                  </div>
                </div>

                {/* AI Brand Extractor Panel */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid var(--primary)', background: 'hsla(38, 45%, 60%, 0.02)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                    </svg>
                    AI Brand Extractor
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Onboard any custom hotel or resort instantly. Type their website URL below, and Gemini 3.1 Flash-Lite will extract their brand name, premium color palettes, custom typography, and elite greetings.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <input
                        type="text"
                        placeholder="e.g. fourseasons.com"
                        value={extractionUrl}
                        onChange={(e) => setExtractionUrl(e.target.value)}
                        style={{
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                    </div>
                    
                    <button
                      type="button"
                      disabled={loadingBrand || !extractionUrl.trim()}
                      onClick={handleExtractBrand}
                      className="btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                    >
                      {loadingBrand ? (
                        <>
                          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }}>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Extracting Brand Identity...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                          Extract Brand with Gemini
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Sub-Tab 2: Technical Webhooks Integration Panel */}
          {integrationTab === 'webhook' && (
            <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Plain English Visual Guide for Non-Tech Savvy Operators */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    How Webhooks Work (Zero-Code Guide)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    You don't need a software developer or coding experience to connect your existing hotel systems! Webhooks act as background notifications that sync reservations automatically.
                  </p>
                </div>

                {/* Conceptual Process Flow Infographic */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 650, display: 'block', color: 'var(--text-primary)' }}>Staff Checks-In Guest</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>You check in Michael Jordan at your front desk in your PMS software (e.g. Cloudbeds).</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 650, display: 'block', color: 'var(--text-primary)' }}>PMS Sends Background Message</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Your software immediately emails details to our secure webhook URL behind the scenes.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 650, display: 'block', color: 'var(--text-primary)' }}>Itinerary Activated Instantly</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>MongoDB is seeded, the AI compiles a weather-aware flyer, and prints their welcome QR code!</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>Configuration Steps for Cloudbeds or MEWS:</h4>
                  <ol style={{ fontSize: '0.82rem', color: 'var(--text-dim)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, lineHeight: '1.5' }}>
                    <li>Log in to your <strong>Cloudbeds / MEWS Dashboard</strong>.</li>
                    <li>Go to <strong>Settings ➔ Manage Integrations</strong> (or look for Webhooks).</li>
                    <li>Click <strong>"Add Webhook"</strong> or <strong>"Register Endpoint"</strong>.</li>
                    <li>Choose the event trigger: <strong>"Guest Checked In"</strong> (or "Reservation Created").</li>
                    <li>Copy and Paste this exact URL into the input field:
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', marginBottom: '4px' }}>
                        <input 
                          type="text" 
                          readOnly 
                          value={`${API_BASE}/api/pms/sync-guest`} 
                          style={{ fontSize: '0.75rem', fontFamily: 'monospace', padding: '6px 10px', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '4px', flex: 1, color: '#38bdf8' }}
                          onClick={(e) => {
                            e.currentTarget.select();
                            document.execCommand('copy');
                            alert("Copied to clipboard!");
                          }}
                        />
                        <button 
                          type="button" 
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                          onClick={() => {
                            navigator.clipboard.writeText(`${API_BASE}/api/pms/sync-guest`);
                            alert("Copied to clipboard!");
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </li>
                    <li>Click <strong>Save</strong>. You are completely done! Everything is fully automated.</li>
                  </ol>
                </div>
              </div>

              {/* Developer Documentation & Automated Mock Synergizer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Tech Endpoint Specs */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>
                    JSON API Endpoint Definition
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    For developers building bespoke pipelines. Delivers standard Pydantic payload models.
                  </p>
                  
                  <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--border-color)', marginTop: '4px' }}>
                    <span style={{ color: '#38bdf8', fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>POST /api/pms/sync-guest</span>
                    <pre style={{ color: '#cbd5e1', fontSize: '0.72rem', margin: 0, fontFamily: 'Courier New, monospace' }}>
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
                </div>

                {/* Trigger Buttons */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>
                    Trigger Webhook Simulation
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Quickly verify and test endpoint integrations by triggering live checked-in payloads for preset guests.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        hotel_id: "hotel_lacoralina",
                        hotel_name: "La Coralina Island House",
                        bookings: [
                          {
                            tour_id: "t6",
                            date: new Date().toISOString().split('T')[0],
                            slot: "morning",
                            price: 75.0
                          }
                        ]
                      })}
                      style={{ padding: '12px', width: '100%', fontSize: '0.82rem' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      Sync Webhook for "John Wick" (La Coralina)
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
                        hotel_id: "hotel_redfrog",
                        hotel_name: "Red Frog Beach Resort",
                        bookings: [
                          {
                            tour_id: "t2",
                            date: new Date().toISOString().split('T')[0],
                            slot: "afternoon",
                            price: 65.0
                          }
                        ]
                      })}
                      style={{ padding: '12px', width: '100%', fontSize: '0.82rem' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      Sync Webhook for "Lara Croft" (Red Frog Resort)
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Sub-Tab 3: Custom Tours Registration Portal */}
          {integrationTab === 'custom_tours' && (
            <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Interactive Registration Form Card */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Register New Local Excursion
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Create custom premium activities, eco-tours, or wellness experiences for your resort and sync them live to MongoDB.
                  </p>
                </div>

                <form onSubmit={handleCustomTourSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Name field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Excursion Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Starfish Beach Eco-Kayak Adventure" 
                      value={customTourName}
                      onChange={(e) => setCustomTourName(e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.25s'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Type field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Excursion Type</label>
                      <select 
                        value={customTourType}
                        onChange={(e) => setCustomTourType(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="outdoor">🌿 Outdoor Adventure</option>
                        <option value="indoor">🏡 Indoor Experience</option>
                      </select>
                    </div>

                    {/* Price field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Price per Guest ($ USD)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder="75.00"
                        value={customTourPrice}
                        onChange={(e) => setCustomTourPrice(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Capacity field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Max Capacity (Guests)</label>
                      <input 
                        type="number" 
                        min="1"
                        placeholder="10"
                        value={customTourCapacity}
                        onChange={(e) => setCustomTourCapacity(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Location field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Location</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Isla Colon" 
                        value={customTourLocation}
                        onChange={(e) => setCustomTourLocation(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Slots field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Available Time Slots</label>
                    <div style={{ display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          checked={customTourSlots.includes('morning')} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomTourSlots(prev => [...prev, 'morning']);
                            } else {
                              setCustomTourSlots(prev => prev.filter(s => s !== 'morning'));
                            }
                          }}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                        ☀️ Morning Slot
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          checked={customTourSlots.includes('afternoon')} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomTourSlots(prev => [...prev, 'afternoon']);
                            } else {
                              setCustomTourSlots(prev => prev.filter(s => s !== 'afternoon'));
                            }
                          }}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                        🌤️ Afternoon Slot
                      </label>
                    </div>
                  </div>

                  {/* Description field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Excursion Description</label>
                    <textarea 
                      placeholder="Give a vivid, high-fidelity description of this overwater or rainforest excursion..." 
                      rows="3"
                      value={customTourDesc}
                      onChange={(e) => setCustomTourDesc(e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={loading}
                    style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '4px' }}
                  >
                    {loading ? (
                      <span className="spinner"></span>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Publish Excursion to MongoDB
                      </>
                    )}
                  </button>

                </form>
              </div>

              {/* Active Registry Preview Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Active Excursion List Card */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                      Active Excursion Registry ({tours.length})
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--primary-glow)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '10px' }}>
                      DB Sync Live
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '430px', overflowY: 'auto', paddingRight: '4px' }}>
                    {tours.map((tour) => {
                      const isCustom = tour._id && tour._id.startsWith('t_custom');
                      return (
                        <div 
                          key={tour._id} 
                          style={{
                            background: isCustom ? 'rgba(212, 175, 55, 0.04)' : 'rgba(255,255,255,0.01)',
                            border: `1px solid ${isCustom ? 'rgba(212, 175, 55, 0.25)' : 'var(--border-color)'}`,
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'all 0.25s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                                {tour.name}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {tour.type === 'outdoor' ? '🌿 Outdoor Adventure' : '🏡 Indoor Experience'} • 📍 {tour.location || 'Bocas'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '4px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                                ${tour.price}
                              </span>
                              {isCustom && (
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                  CUSTOM
                                </span>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: '1.4' }}>
                            {tour.description}
                          </p>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                            {tour.slots && tour.slots.map(s => (
                              <span key={s} style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {s === 'morning' ? '☀️ Morning' : '🌤️ Afternoon'}
                              </span>
                            ))}
                            <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', marginLeft: 'auto' }}>
                              Cap: {tour.capacity || 10}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}
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
