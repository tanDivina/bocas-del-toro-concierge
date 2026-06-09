import React, { useState } from 'react';

const logTypes = [
  { emoji: '🤖', label: 'AGENT', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.25)' },
  { emoji: '💬', label: 'GUEST', bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.25)' },
  { emoji: '❌', label: 'ERROR', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' },
  { emoji: '⛈️', label: 'WEATHER', bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.25)' },
  { emoji: '🔍', label: 'TOOL CALL', bg: 'rgba(234, 179, 8, 0.12)', color: '#eab308', border: 'rgba(234, 179, 8, 0.25)' },
  { emoji: '📥', label: 'TOOL RETURN', bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.25)' },
  { emoji: '👉', label: 'DECISION', bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: 'rgba(249, 115, 22, 0.25)' },
  { emoji: '✅', label: 'SUCCESS', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
  { emoji: '🛎️', label: 'PMS WEBHOOK', bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.25)' },
  { emoji: '🎒', label: 'INTEGRATION', bg: 'rgba(20, 184, 166, 0.12)', color: '#14b8a6', border: 'rgba(20, 184, 166, 0.25)' },
  { emoji: 'ℹ️', label: 'INFO', bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.25)' },
  { emoji: '🔄', label: 'SYSTEM', bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.25)' },
];

function renderParsedLog(log, index) {
  let matched = null;
  for (const lt of logTypes) {
    if (log.startsWith(lt.emoji)) {
      matched = lt;
      break;
    }
  }

  const isCall = matched?.emoji === '🔍';
  const isRet = matched?.emoji === '📥';
  const isError = matched?.emoji === '❌';

  let logText = log;
  if (matched) {
    logText = log.substring(matched.emoji.length).trim();
  }

  return (
    <div 
      key={index} 
      className={`console-line ${isCall ? 'call' : (isRet ? 'ret' : (isError ? 'err' : ''))}`}
      style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '10px', 
        padding: '6px 8px', 
        borderRadius: '6px',
        fontSize: '0.82rem',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.4'
      }}
    >
      {matched && (
        <span 
          style={{ 
            background: matched.bg, 
            color: matched.color, 
            border: `1px solid ${matched.border}`, 
            padding: '2px 6px', 
            borderRadius: '4px', 
            fontSize: '0.68rem', 
            fontWeight: 700, 
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'inline-block',
            flexShrink: 0,
            userSelect: 'none'
          }}
        >
          {matched.label}
        </span>
      )}
      <span style={{ flex: 1, marginTop: '1px' }}>{logText}</span>
    </div>
  );
}

export default function ControlPanel({ 
  logistics, 
  onSimulate, 
  onReset, 
  agentLogs, 
  loading 
}) {
  const sortedLogistics = logistics ? [...logistics].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWeather, setSelectedWeather] = useState('Heavy Rain');
  const [selectedAlert, setSelectedAlert] = useState('rain_warning');

  React.useEffect(() => {
    if (sortedLogistics.length > 0 && (!selectedDate || !sortedLogistics.some(l => l.date === selectedDate))) {
      setSelectedDate(sortedLogistics[0].date);
    }
  }, [logistics]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSimulate({
      date: selectedDate,
      weather: selectedWeather,
      alert: selectedAlert
    });
  };

  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Operator Control Panel
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Simulate weather shifts and watch the agent coordinate logistics.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Date</label>
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'var(--slot-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                padding: '8px',
                fontSize: '0.9rem',
                transition: 'background-color 0.8s ease, color 0.5s ease'
              }}
            >
              {sortedLogistics.map(log => (
                <option key={log.date} value={log.date}>{log.date}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weather Forecast</label>
            <select 
              value={selectedWeather}
              onChange={(e) => setSelectedWeather(e.target.value)}
              style={{
                background: 'var(--slot-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                padding: '8px',
                fontSize: '0.9rem',
                transition: 'background-color 0.8s ease, color 0.5s ease'
              }}
            >
              <option value="Sunny">Sunny</option>
              <option value="Rainy">Light Rain</option>
              <option value="Heavy Rain">Heavy Rain (Storm Warning)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weather Alert Status</label>
          <select 
            value={selectedAlert}
            onChange={(e) => setSelectedAlert(e.target.value)}
            style={{
              background: 'var(--slot-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              padding: '8px',
              fontSize: '0.9rem',
              transition: 'background-color 0.8s ease, color 0.5s ease'
            }}
          >
            <option value="none">None (Optimal Conditions)</option>
            <option value="rain_warning">Rain Warning (Trigger Replan)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {loading ? 'Simulating...' : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
                  <polyline points="13 11 9 17 12 17 10 23" />
                </svg>
                Trigger Weather Shift
              </span>
            )}
          </button>
          
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onReset}
            disabled={loading}
            style={{ 
              borderColor: 'var(--error)', 
              color: 'var(--error)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <polyline points="3 3 3 8 8 8" />
            </svg>
            Reset DB
          </button>
        </div>
      </form>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Active Weather Board</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logistics && logistics.map((log) => (
            <div key={log.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--slot-empty-bg)', borderRadius: '6px', fontSize: '0.85rem', transition: 'background-color 0.8s ease' }}>
              <span style={{ color: 'var(--text-primary)' }}>{log.date}</span>
              <span style={{ 
                color: log.weather === 'Heavy Rain' ? 'var(--error)' : (log.weather === 'Rainy' ? 'var(--warning)' : 'var(--primary)'),
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {log.weather}
                {log.alert !== 'none' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Agent Execution Logs (MCP / Tool Calls)
        </h3>
        <div className="console-container">
          {agentLogs.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
              No execution events registered yet. Simulate a weather shift or chat with the agent to populate logs.
            </div>
          ) : (
            agentLogs.map((log, index) => renderParsedLog(log, index))
          )}
        </div>
      </div>
    </div>
  );
}
