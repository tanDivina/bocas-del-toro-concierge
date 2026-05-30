import React from 'react';

export default function ItineraryDoc({ itineraryMarkdown }) {
  const renderMarkdown = (md) => {
    if (!md) {
      return (
        <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
          Itinerary document is not generated yet. Select a weather warning or swap activities to generate your official travel receipt.
        </div>
      );
    }

    const lines = md.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 700, margin: '20px 0 12px 0', borderBottom: '2px solid var(--primary)', paddingBottom: '6px', color: '#0f172a' }}>{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} style={{ fontSize: '1.1rem', fontWeight: 600, margin: '16px 0 8px 0', color: 'hsl(188, 86%, 30%)' }}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} style={{ fontWeight: 600, margin: '8px 0', color: '#0f172a' }}>{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ')) {
        const text = line.replace('- ', '');
        const boldMatch = text.match(/\*\*(.*?)\*\*/g);
        let renderedText = text;
        if (boldMatch) {
          boldMatch.forEach(m => {
            const clean = m.replace(/\*\*/g, '');
            renderedText = renderedText.replace(m, `<strong>${clean}</strong>`);
          });
        }
        return (
          <div 
            key={index} 
            style={{ marginLeft: '12px', paddingLeft: '8px', borderLeft: '2px solid #cbd5e1', margin: '6px 0', fontSize: '0.88rem' }}
            dangerouslySetInnerHTML={{ __html: renderedText }}
          />
        );
      }
      if (line.startsWith('---')) {
        return <hr key={index} style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '20px 0' }} />;
      }
      if (line.trim() === '') {
        return <div key={index} style={{ height: '8px' }} />;
      }
      
      let renderedLine = line;
      const boldMatch = line.match(/\*\*(.*?)\*\*/g);
      if (boldMatch) {
        boldMatch.forEach(m => {
          const clean = m.replace(/\*\*/g, '');
          renderedLine = renderedLine.replace(m, `<strong>${clean}</strong>`);
        });
      }
      return (
        <p 
          key={index} 
          style={{ fontSize: '0.9rem', color: '#334155', margin: '4px 0' }}
          dangerouslySetInnerHTML={{ __html: renderedLine }}
        />
      );
    });
  };

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'hsl(222, 47%, 9%)', minHeight: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          📄 Generated Document View
        </h2>
        {itineraryMarkdown && (
          <button 
            className="btn-secondary" 
            onClick={() => window.print()} 
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            🖨️ Print Itinerary
          </button>
        )}
      </div>

      <div style={{ 
        background: 'white', 
        color: '#1e293b', 
        padding: '30px', 
        borderRadius: '8px', 
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        maxHeight: '450px',
        lineHeight: '1.6'
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          strong { font-weight: 600; color: #0f172a; }
        `}} />
        {renderMarkdown(itineraryMarkdown)}
      </div>
    </div>
  );
}
