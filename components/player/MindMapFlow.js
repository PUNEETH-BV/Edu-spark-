// MindMapFlow.js – Pure client-side React Flow canvas (no SSR)
// This file is dynamically imported by MindMapPanel.js
import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';

export default function MindMapFlow({ nodes, edges, onNodeClick, onPaneClick }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.2}
      maxZoom={2.5}
      style={{ background: 'transparent' }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
    >
      <Background
        color="rgba(168,199,250,0.05)"
        gap={28}
        size={1.5}
        variant={BackgroundVariant.Dots}
      />
      <Controls
        style={{
          background: '#1E2030',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
        showInteractive={false}
      />
      <MiniMap
        nodeColor={(n) => {
          const typeColors = {
            root: '#A8C7FA',
            concept: '#81C995',
            detail: '#9AA0A6',
            example: '#FFB74D',
          };
          return typeColors[n.data?._type] || '#9AA0A6';
        }}
        style={{
          background: '#1E2030',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
        }}
        maskColor="rgba(12,14,20,0.75)"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
