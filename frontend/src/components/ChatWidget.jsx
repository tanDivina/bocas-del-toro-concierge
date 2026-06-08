import React, { useState, useEffect, useRef } from 'react';

export default function ChatWidget({ 
  messages, 
  onSendMessage, 
  onRespondProposal, 
  loading,
  bookings
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input);
    setInput('');
  };

  const isProposalMessage = (msgText) => {
    if (!msgText) return false;
    const lower = msgText.toLowerCase();
    return lower.includes('reschedule') || lower.includes('swap') || lower.includes('alternative');
  };

  return (
    <div className="glass-card" style={{ height: '550px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
          🏝️
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Bocas Eco-Concierge</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }}></span>
            Local Agent Active
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
            <span style={{ fontSize: '2.5rem' }}>👋</span>
            <div style={{ fontWeight: 500, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Welcome to Bocas del Toro!</div>
            <p style={{ fontSize: '0.85rem', maxWidth: '320px' }}>
              I am your local concierge, my friend. I've scheduled your activities. Talk to me if you want to check, reschedule, or look for local recommendations!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            
            const showProposalCard = !isUser && 
                                     index === messages.length - 1 && 
                                     isProposalMessage(msg.text) &&
                                     bookings.some(b => b.status === 'confirmed' && b.tour_id === 't1' && b.date === '2026-05-30');

            return (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '80%' }}>
                  <div 
                    style={{ 
                      background: isUser ? 'var(--msg-user-bg)' : 'var(--msg-agent-bg)',
                      border: isUser ? '1px solid var(--border-color)' : '1px solid hsla(168, 76%, 42%, 0.2)',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '12px 16px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    {msg.text && msg.text.replace(/\[Guest Context:.*?\]\n/g, '')}
                  </div>

                  {showProposalCard && (
                    <div 
                      className="glass-card" 
                      style={{ 
                        padding: '16px', 
                        background: 'hsla(38, 92%, 50%, 0.08)',
                        border: '1px solid var(--warning)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontWeight: 600, fontSize: '0.85rem' }}>
                        ⛈️ Weather Replan Proposal
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        Swap **Cayos Zapatilla Snorkeling** (Outdoor - May 30) for **Green Cacao Chocolate Workshop** (Indoor Alternative).
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          className="btn-primary" 
                          onClick={() => onRespondProposal('b1', '2026-05-30', 't4', true)}
                          style={{ 
                            flex: 1, 
                            padding: '6px 12px', 
                            fontSize: '0.8rem',
                            background: 'linear-gradient(135deg, var(--warning), hsl(25, 95%, 50%))',
                            boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)'
                          }}
                        >
                          ✅ Confirm Swap
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={() => onRespondProposal('b1', '2026-05-30', null, false)}
                          style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Keep Snorkeling
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <div style={{ 
              background: 'var(--msg-agent-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px 16px 16px 4px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              <span className="dot-typing">💬 Concierge is planning...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', background: 'var(--panel-bg)' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message your island concierge..."
          disabled={loading}
          style={{
            flex: 1,
            background: 'var(--slot-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            padding: '10px 16px',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading || !input.trim()}
          style={{ padding: '10px 16px' }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
