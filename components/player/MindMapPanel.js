// MindMapPanel.js – Interactive mind map with React Flow
import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Inject React Flow CSS on client-side only (avoids SSR/Next.js CSS pipeline issues)
function useReactFlowCSS() {
  useEffect(() => {
    const id = 'xyflow-react-styles';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'https://unpkg.com/@xyflow/react@12/dist/style.css';
    document.head.appendChild(link);
  }, []);
}

// Load the entire React Flow canvas client-side only
const MindMapFlow = dynamic(() => import('./MindMapFlow'), {
  ssr: false,
  loading: () => <MindMapSkeleton />,
});

// ─── Node type styles ──────────────────────────────────────────────────────────
const NODE_STYLES = {
  root: {
    background: 'linear-gradient(135deg, #A8C7FA 0%, #7FA8E8 100%)',
    color: '#0D1117',
    border: '2px solid rgba(168,199,250,0.5)',
    borderRadius: '40px',
    padding: '14px 24px',
    fontSize: '13px',
    fontWeight: '700',
    boxShadow: '0 0 24px rgba(168,199,250,0.3), 0 4px 16px rgba(0,0,0,0.4)',
    minWidth: 140,
    textAlign: 'center',
    cursor: 'pointer',
  },
  concept: {
    background: 'linear-gradient(135deg, #2A2D3E 0%, #1E2030 100%)',
    color: '#E3E3E3',
    border: '1.5px solid rgba(168,199,250,0.25)',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
    minWidth: 110,
    textAlign: 'center',
    cursor: 'pointer',
  },
  detail: {
    background: 'rgba(255,255,255,0.04)',
    color: '#C8C8C8',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: '500',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    minWidth: 90,
    textAlign: 'center',
    cursor: 'pointer',
  },
  example: {
    background: 'rgba(255,183,77,0.08)',
    color: '#FFB74D',
    border: '1px dashed rgba(255,183,77,0.3)',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '10px',
    fontWeight: '500',
    minWidth: 85,
    textAlign: 'center',
    cursor: 'pointer',
  },
};

// ─── Auto-layout: left-to-right tree ─────────────────────────────────────────
function computeLayout(rawNodes, rawEdges) {
  if (!rawNodes || !rawNodes.length) return [];

  const rootRaw = rawNodes.find(n => n.type === 'root') || rawNodes[0];

  // Build adjacency for BFS
  const childMap = {};
  rawEdges.forEach(e => {
    if (!childMap[e.source]) childMap[e.source] = [];
    childMap[e.source].push(e.target);
  });

  // BFS levels
  const levels = { [rootRaw.id]: 0 };
  const queue  = [rootRaw.id];
  while (queue.length) {
    const cur = queue.shift();
    (childMap[cur] || []).forEach(child => {
      if (levels[child] === undefined) {
        levels[child] = levels[cur] + 1;
        queue.push(child);
      }
    });
  }

  // Group by level
  const byLevel = {};
  rawNodes.forEach(n => {
    const lvl = levels[n.id] ?? 1;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(n.id);
  });

  const X_SPACING  = 260;
  const Y_SPACING  = 110;
  const positions  = {};

  Object.keys(byLevel)
    .sort((a, b) => +a - +b)
    .forEach(lvl => {
      const ids   = byLevel[lvl];
      const total = (ids.length - 1) * Y_SPACING;
      ids.forEach((id, i) => {
        positions[id] = {
          x: +lvl * X_SPACING,
          y: i * Y_SPACING - total / 2,
        };
      });
    });

  // Build React Flow nodes
  return rawNodes.map(n => ({
    id: n.id,
    position: positions[n.id] || { x: 0, y: 0 },
    style: NODE_STYLES[n.type] || NODE_STYLES.detail,
    draggable: true,
    data: {
      label: (
        <span style={{ lineHeight: 1.3 }}>
          {n.label}
          {n.description && (
            <span style={{ display: 'block', fontSize: '9px', opacity: 0.65, marginTop: 3, fontWeight: 400 }}>
              {n.description.length > 55 ? n.description.slice(0, 55) + '…' : n.description}
            </span>
          )}
        </span>
      ),
      _type: n.type,
      _raw: n,
    },
  }));
}

function computeEdges(rawEdges) {
  return (rawEdges || []).map((e, i) => ({
    id: `edge-${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    label: e.label || '',
    type: 'smoothstep',
    animated: false,
    style: { stroke: 'rgba(168,199,250,0.3)', strokeWidth: 1.5 },
    labelStyle: { fontSize: 9, fill: '#9AA0A6', fontFamily: 'Inter, sans-serif' },
    labelBgStyle: { fill: 'transparent' },
    markerEnd: {
      type: 'ArrowClosed',
      color: 'rgba(168,199,250,0.4)',
      width: 12,
      height: 12,
    },
  }));
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function MindMapSkeleton() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 420, gap: 16, background: '#12141C',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(168,199,250,0.15), rgba(168,199,250,0.04))',
        border: '2px solid rgba(168,199,250,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'mmPulse 1.5s ease-in-out infinite',
      }}>
        <span style={{ fontSize: 28 }}>🧠</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#E3E3E3', fontSize: 14, fontWeight: 600, margin: 0 }}>
          Mapping concepts...
        </p>
        <p style={{ color: '#9AA0A6', fontSize: 12, marginTop: 5, marginBottom: 0 }}>
          AI is analyzing your course material
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: '#A8C7FA',
            animation: `mmBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes mmPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
        @keyframes mmBounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-7px);opacity:1}}
      `}</style>
    </div>
  );
}

// ─── Node info panel ─────────────────────────────────────────────────────────
function NodeInfo({ node, onClose }) {
  if (!node) return null;
  const raw = node.data?._raw;
  const typeColor = { root: '#A8C7FA', concept: '#81C995', detail: '#C8C8C8', example: '#FFB74D' };
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      background: '#1C1F2E', border: '1px solid rgba(168,199,250,0.15)',
      borderRadius: 12, padding: '12px 16px', minWidth: 230, maxWidth: 320,
      zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      animation: 'nodeInfoIn 0.15s ease',
    }}>
      <style>{`@keyframes nodeInfoIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            color: typeColor[raw?.type] || '#9AA0A6',
            textTransform: 'uppercase', display: 'block', marginBottom: 4,
          }}>
            {raw?.type || 'node'}
          </span>
          <p style={{ color: '#E3E3E3', fontSize: 13, fontWeight: 600, margin: 0 }}>
            {raw?.label}
          </p>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#9AA0A6',
          cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1,
          flexShrink: 0,
        }}>×</button>
      </div>
      {raw?.description && (
        <p style={{ color: '#9AA0A6', fontSize: 11, marginTop: 8, marginBottom: 0, lineHeight: 1.55 }}>
          {raw.description}
        </p>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function MindMapPanel({ video, segments }) {
  useReactFlowCSS(); // Inject @xyflow/react CSS client-side only
  const [graphData, setGraphData]       = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [rfNodes, setRfNodes]           = useState([]);
  const [rfEdges, setRfEdges]           = useState([]);

  useEffect(() => {
    if (video) loadMindMap();
  }, [video?.id]);

  useEffect(() => {
    if (!graphData) return;
    setRfNodes(computeLayout(graphData.nodes || [], graphData.edges || []));
    setRfEdges(computeEdges(graphData.edges || []));
  }, [graphData]);

  async function loadMindMap() {
    setLoading(true);
    setError('');
    setSelectedNode(null);
    setGraphData(null);
    try {
      const res = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: video.title,
          subject:    video.subject,
          segments:   segments,
          content:    video.content,
          style:      'semantic',
        }),
      });
      const data = await res.json();
      if (data.nodes && Array.isArray(data.nodes)) {
        setGraphData(data);
      } else {
        setError('Could not parse mind map data. Please try regenerating.');
      }
    } catch (err) {
      console.error('MindMap fetch error:', err);
      setError('Failed to generate mind map.');
    } finally {
      setLoading(false);
    }
  }

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const nodeCount = graphData?.nodes?.length || 0;
  const edgeCount = graphData?.edges?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🧠</span>
          <div>
            <h3 style={{
              fontSize: 11, fontWeight: 700, color: '#9AA0A6',
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
            }}>
              Concept Mind Map
            </h3>
            {graphData && (
              <p style={{ fontSize: 10, color: '#9AA0A6', margin: 0, marginTop: 2 }}>
                {nodeCount} nodes · {edgeCount} connections
              </p>
            )}
          </div>
        </div>

        <button
          onClick={loadMindMap}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(168,199,250,0.08)',
            border: '1px solid rgba(168,199,250,0.18)',
            borderRadius: 8, padding: '6px 12px',
            color: '#A8C7FA', fontSize: 11, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>↺</span>
          {loading ? 'Generating…' : 'Re-generate'}
        </button>
      </div>

      {/* ── Canvas area ── */}
      <div style={{ flex: 1, position: 'relative', background: '#12141C', minHeight: 400 }}>
        {loading ? (
          <MindMapSkeleton />
        ) : error ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 420, gap: 12, padding: 24,
          }}>
            <span style={{ fontSize: 36 }}>⚠️</span>
            <p style={{ color: '#9AA0A6', fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>
            <button onClick={loadMindMap} style={{
              background: 'rgba(168,199,250,0.1)', border: '1px solid rgba(168,199,250,0.2)',
              borderRadius: 8, padding: '8px 16px', color: '#A8C7FA',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Try Again</button>
          </div>
        ) : !graphData ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 420, gap: 16, padding: 24,
          }}>
            <span style={{ fontSize: 48, opacity: 0.35 }}>🗺️</span>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#E3E3E3', fontSize: 14, fontWeight: 600, margin: 0 }}>
                No mind map yet
              </p>
              <p style={{ color: '#9AA0A6', fontSize: 12, marginTop: 5, marginBottom: 0 }}>
                Generate a visual concept map from your course material
              </p>
            </div>
            <button onClick={loadMindMap} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, rgba(168,199,250,0.18), rgba(168,199,250,0.08))',
              border: '1px solid rgba(168,199,250,0.25)',
              borderRadius: 10, padding: '10px 22px',
              color: '#A8C7FA', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <span>🧠</span> Generate Mind Map
            </button>
          </div>
        ) : (
          <>
            <div style={{ width: '100%', height: 460 }}>
              <MindMapFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
              />
            </div>

            {selectedNode && (
              <NodeInfo node={selectedNode} onClose={() => setSelectedNode(null)} />
            )}
          </>
        )}
      </div>

      {/* ── Legend ── */}
      {graphData && !loading && (
        <div style={{
          padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center',
          flexShrink: 0,
        }}>
          {[
            { label: 'Root',    color: '#A8C7FA' },
            { label: 'Concept', color: '#81C995' },
            { label: 'Detail',  color: '#9AA0A6' },
            { label: 'Example', color: '#FFB74D' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              <span style={{ color: '#9AA0A6', fontSize: 10 }}>{label}</span>
            </div>
          ))}
          <span style={{ color: '#9AA0A6', fontSize: 10, marginLeft: 'auto', opacity: 0.7 }}>
            Drag · Scroll to zoom · Click node for details
          </span>
        </div>
      )}
    </div>
  );
}
