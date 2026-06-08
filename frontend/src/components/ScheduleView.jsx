import React from 'react';

export default function ScheduleView({ bookings, tours, logistics }) {
  const dates = ["2026-05-30", "2026-05-31", "2026-06-01", "2026-06-02"];

  const getBookingForSlot = (date, slot) => {
    const booking = bookings.find(b => b.date === date && b.slot === slot);
    if (!booking) return null;
    
    const tour = tours.find(t => t._id === booking.tour_id);
    return {
      ...booking,
      tour
    };
  };

  const getWeatherForDate = (date) => {
    const log = logistics.find(l => l.date === date);
    return log ? { weather: log.weather, alert: log.alert } : { weather: 'Sunny', alert: 'none' };
  };

  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏝 ... Stay Schedule Timeline
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Alex Mercer's 4-day itinerary slots (May 30 - June 2).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {dates.map((date) => {
          const { weather, alert } = getWeatherForDate(date);
          const hasRainAlert = alert !== 'none';
          const isHeavyRain = weather === 'Heavy Rain';

          return (
            <div 
              key={date} 
              style={{ 
                background: 'var(--slot-bg)', 
                borderRadius: '12px', 
                border: hasRainAlert ? '1px solid var(--warning)' : '1px solid var(--border-color)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                transition: 'background-color 0.8s ease, border-color 0.8s ease'
              }}
            >
              {/* Day Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{date}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Day {dates.indexOf(date) + 1}
                  </div>
                </div>
                <div 
                  title={`Weather: ${weather}`}
                  style={{ 
                    fontSize: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: hasRainAlert ? 'var(--warning)' : 'var(--primary)'
                  }}
                >
                  {isHeavyRain ? '⛈️' : (weather === 'Rainy' ? '🌦️' : '☀️')}
                </div>
              </div>

              {/* Weather Warning Header */}
              {hasRainAlert && (
                <div style={{ 
                  background: isHeavyRain ? 'var(--error-glow)' : 'var(--warning-glow)', 
                  border: `1px solid ${isHeavyRain ? 'var(--error)' : 'var(--warning)'}`,
                  color: isHeavyRain ? 'var(--error)' : 'var(--warning)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textAlign: 'center'
                }}>
                  ⚠️ {isHeavyRain ? '⛈️ Storm Warning!' : '🌦️ Rain Forecasted'}
                </div>
              )}

              {/* Slots */}
              {["morning", "afternoon"].map((slot) => {
                const slotData = getBookingForSlot(date, slot);
                
                return (
                  <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>
                      {slot}
                    </div>
                    {slotData ? (
                      <div 
                        style={{ 
                          background: slotData.tour?.type === 'indoor' ? 'hsla(188, 86%, 43%, 0.08)' : 'hsla(168, 76%, 42%, 0.08)',
                          border: `1px dashed ${slotData.tour?.type === 'indoor' ? 'var(--accent)' : 'var(--primary)'}`,
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.2' }}>
                            {slotData.tour?.name || 'Loading tour...'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📍 {slotData.tour?.location}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            ${slotData.price}
                          </span>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            background: slotData.status === 'confirmed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: slotData.status === 'confirmed' ? 'var(--primary)' : 'var(--warning)',
                            border: `1px solid ${slotData.status === 'confirmed' ? 'var(--primary)' : 'var(--warning)'}`,
                            fontWeight: 600,
                            letterSpacing: '0.5px'
                          }}>
                            {slotData.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div 
                        style={{ 
                          background: 'var(--slot-empty-bg)', 
                          border: '1px dashed var(--border-color)', 
                          borderRadius: '8px',
                          padding: '10px',
                          fontSize: '0.75rem',
                          color: 'var(--text-dim)',
                          fontStyle: 'italic',
                          textAlign: 'center',
                          transition: 'background-color 0.8s ease, border-color 0.8s ease'
                        }}
                      >
                        Empty Slot
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
