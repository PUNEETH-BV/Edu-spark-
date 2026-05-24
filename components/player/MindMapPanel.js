// MindMapPanel.js – visualizing concept connections using Mermaid.js
import React, { useState, useEffect, useRef } from 'react';

export default function MindMapPanel({ video, segments }) {
  const [mermaidCode, setMermaidCode] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const containerRef = useRef(null);
  const renderIdRef  = useRef(0);

  useEffect(() => {
    if (video) loadMindMap();
  }, [video]);

  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return;
    renderDiagram(mermaidCode);
  }, [mermaidCode]);

  async function renderDiagram(code) {
    if (!containerRef.current) return;
    setError('');

    try {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          primaryColor: '#7c3aed',
          primaryTextColor: '#f0f0ff',
          primaryBorderColor: 'rgba(124,58,237,0.4)',
          lineColor: '#8b8bb5',
          background: '#12122a',
          mainBkg: '#1a1a35',
          nodeBorder: 'rgba(124,58,237,0.3)',
          clusterBkg: 'rgba(124,58,237,0.1)',
        },
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
      });

      renderIdRef.current += 1;
      const id = `mermaid-${renderIdRef.current}`;

      const { svg } = await mermaid.render(id, code);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    } catch (err) {
      console.error('Mermaid render error:', err);
      setError('Could not render mind map. Showing raw code below.');
    }
  }

  async function loadMindMap() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: video.title,
          subject:    video.subject,
          segments:   segments,
          content:    video.content
        }),
      });
      const data = await res.json();
      setMermaidCode(data.mermaid || '');
    } catch (err) {
      console.error('Failed to load mindmap:', err);
      setError('Failed to generate mind map.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Concept Mind Map</h3>
        <button onClick={loadMindMap} className="btn-ghost text-[10px] py-1 font-bold">🔄 Re-generate</button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" style={{ width: 32, height: 32 }} />
          <p className="text-sm text-text-muted">Plotting topic connections using Mermaid.js...</p>
        </div>
      ) : mermaidCode ? (
        <div className="glass p-4 rounded-2xl border border-white/5 overflow-x-auto bg-surface2/20 flex justify-center min-h-[300px] items-start">
          {error ? (
            <div className="space-y-2 w-full">
              <p className="text-xs text-red-400">{error}</p>
              <pre className="text-[10px] text-text-muted whitespace-pre-wrap break-all font-mono">{mermaidCode}</pre>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="select-none text-center w-full"
              style={{ minHeight: 280 }}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xs text-center py-8 text-text-muted">No mind map data. Click Re-generate.</p>
          <button onClick={loadMindMap} className="btn-primary py-2 px-4 text-xs font-bold rounded-xl">
            <span>Generate Mind Map</span>
          </button>
        </div>
      )}
    </div>
  );
}
