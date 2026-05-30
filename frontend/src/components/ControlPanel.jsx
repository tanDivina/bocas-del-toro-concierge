import React, { useState } from 'react';

export default function ControlPanel({ 
  logistics, 
  onSimulate, 
  onReset, 
  agentLogs, 
  loading 
}) {
  const [selectedDate, setSelectedDate] = useState('2026-05-30');
  const [selectedWeather, setSelectedWeather] = useState('Heavy Rain');
  const [selectedAlert, setSelectedAlert] = useState('rain_warning');

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
          ⚙️ Operator Control Panel
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
                background: 'hsl(222, 40%, 15%)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'white',
                padding: '8px',
                fontSize: '0.9rem'
              }}
            >
              <option value="2026-05-30">May 30, 2026</option>
              <option value="2026-05-31">May 31, 2026</option>
              <option value="2026-06-01">June 01, 2026</option>
              <option value="2026-06-02">June 02, 2026</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weather Forecast</label>
            <select 
              value={selectedWeather}
              onChange={(e) => setSelectedWeather(e.target.value)}
              style={{
                background: 'hsl(222, 40%, 15%)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'white',
                padding: '8px',
                fontSize: '0.9rem'
              }}
            >
              <option value="Sunny">Sunny ☀️</option>
              <option value="Rainy">Light Rain 🌦️</option>
              <option value="Heavy Rain">Heavy Rain ⛈️</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weather Alert Status</label>
          <select 
            value={selectedAlert}
            onChange={(e) => setSelectedAlert(e.target.value)}
            style={{
              background: 'hsl(222, 40%, 15%)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'white',
              padding: '8px',
              fontSize: '0.9rem'
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
            {loading ? 'Simulating...' : '⛈️ Trigger Weather Shift'}
          </button>
          
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onReset}
            disabled={loading}
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            Reset DB
          </button>
        </div>
      </form>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Active Weather Board</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logistics && logistics.map((log) => (
            <div key={log.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'hsl(222, 40%, 8%)', borderRadius: '6px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-primary)' }}>{log.date}</span>
              <span style={{ 
                color: log.weather === 'Heavy Rain' ? 'var(--error)' : (log.weather === 'Rainy' ? 'var(--warning)' : 'var(--primary)'),
                fontWeight: 500
              }}>
                {log.weather} {log.alert !== 'none' ? '🚨' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🖥️ Agent Execution Logs (MCP / Tool Calls)
        </h3>
        <div className="console-container">
          {agentLogs.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
              No execution events registered yet. Simulate a weather shift or chat with the agent to populate logs.
            </div>
          ) : (
            agentLogs.map((log, index) => {
              const isCall = log.startsWith('🔍');
              const isRet = log.startsWith('📥');
              return (
                <div 
                  key={index} 
                  className={`console-line ${isCall ? 'call' : (isRet ? 'ret' : '')}`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
