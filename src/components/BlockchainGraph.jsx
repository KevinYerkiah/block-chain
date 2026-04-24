import { useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { colors } from '../config/colors';
import styles from './BlockchainGraph.module.css';

// Force simulation constants
const REPULSION = 5000;       // Increased from 3000 for more spacing
const ATTRACTION = 0.03;
const DAMPING = 0.85;
const IDEAL_DISTANCE = 150;   // Increased from 120 for more spacing
const CENTER_GRAVITY = 0.01;

export default function BlockchainGraph({ isOpen, onClose, initialRecords, highlightEntityId }) {
  const [records, setRecords] = useState(initialRecords || []);
  const [nodes, setNodes] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState(null);
  const [expandedNode, setExpandedNode] = useState(null);
  
  const svgRef = useRef(null);
  const animationRef = useRef(null);
  const settleTicksRef = useRef(0);

  // Initialize nodes from records
  useEffect(() => {
    if (records.length === 0) {
      setNodes([]);
      return;
    }

    const svgRect = svgRef.current?.getBoundingClientRect();
    const centerX = svgRect ? svgRect.width / 2 : 400;
    const centerY = svgRect ? svgRect.height / 2 : 300;

    const newNodes = records.map((record, index) => ({
      id: record.id,
      record,
      index,
      x: centerX + (Math.random() - 0.5) * 100,
      y: centerY + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
    }));

    setNodes(newNodes);
    settleTicksRef.current = 0;
  }, [records]);

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0 || !isOpen) return;

    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(node => ({ ...node }));
        const svgRect = svgRef.current?.getBoundingClientRect();
        const centerX = svgRect ? svgRect.width / 2 : 400;
        const centerY = svgRect ? svgRect.height / 2 : 300;

        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          const nodeA = newNodes[i];
          
          // Skip if being dragged
          if (draggedNode === nodeA.id) continue;

          // Repulsion between all nodes
          for (let j = i + 1; j < newNodes.length; j++) {
            const nodeB = newNodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);
            
            if (dist > 0) {
              const force = REPULSION / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              
              nodeA.vx -= fx;
              nodeA.vy -= fy;
              nodeB.vx += fx;
              nodeB.vy += fy;
            }
          }

          // Attraction along edges (chronological connections)
          if (i > 0) {
            const nodeB = newNodes[i - 1];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
              const force = (dist - IDEAL_DISTANCE) * ATTRACTION;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              
              nodeA.vx += fx;
              nodeA.vy += fy;
              nodeB.vx -= fx;
              nodeB.vy -= fy;
            }
          }

          // Center gravity
          const dx = centerX - nodeA.x;
          const dy = centerY - nodeA.y;
          nodeA.vx += dx * CENTER_GRAVITY;
          nodeA.vy += dy * CENTER_GRAVITY;
        }

        // Apply damping and update positions
        for (const node of newNodes) {
          if (draggedNode === node.id) continue;
          
          node.vx *= DAMPING;
          node.vy *= DAMPING;
          node.x += node.vx;
          node.y += node.vy;
        }

        return newNodes;
      });

      settleTicksRef.current++;
      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, isOpen, draggedNode]);

  // Subscribe to new blockchain records
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel('blockchain-graph')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'blockchain_sync_log',
        filter: 'status=eq.confirmed',
      }, (payload) => {
        if (payload.new.entity_type === 'confession') {
          setRecords(prev => {
            // Check if record already exists to avoid duplicates
            if (prev.some(r => r.id === payload.new.id)) {
              return prev;
            }
            return [...prev, payload.new];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') onClose();
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Zoom and pan handlers
  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setZoom(prevZoom => Math.max(0.3, Math.min(3, prevZoom + delta)));
  }

  function handleBackgroundMouseDown(e) {
    if (e.target.tagName === 'svg' || e.target.tagName === 'g') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }

  function handleMouseMove(e) {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    if (draggedNode !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - svgRect.left - pan.x) / zoom;
      const y = (e.clientY - svgRect.top - pan.y) / zoom;
      
      setNodes(prevNodes => prevNodes.map(node => 
        node.id === draggedNode 
          ? { ...node, x, y, vx: 0, vy: 0 }
          : node
      ));
    }
  }

  function handleMouseUp() {
    setIsPanning(false);
    setDraggedNode(null);
  }

  function handleNodeMouseDown(e, nodeId) {
    e.stopPropagation();
    setDraggedNode(nodeId);
  }

  function handleDoubleClick() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleNodeMouseEnter(node, event) {
    const svgRect = svgRef.current.getBoundingClientRect();
    setTooltipPos({
      x: svgRect.left + node.x * zoom + pan.x,
      y: svgRect.top + node.y * zoom + pan.y,
    });
    setHoveredNode(node.record);
  }

  function handleNodeMouseLeave() {
    setHoveredNode(null);
  }

  function handleNodeClick(node) {
    setExpandedNode(expandedNode?.id === node.record.id ? null : node.record);
  }

  function formatTxHash(hash) {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  // Generate edges
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    if (i > 0) {
      edges.push({
        from: nodes[i - 1],
        to: nodes[i],
      });
    }
  }

  // If a node has no connections, add a self-loop
  if (nodes.length === 1) {
    edges.push({
      from: nodes[0],
      to: nodes[0],
      selfLoop: true,
    });
  }

  const isSettled = settleTicksRef.current > 200;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className={styles.header}>
          <h1 className={styles.title}>Blockchain Network</h1>
          <p className={styles.subtitle}>
            {records.length} confession{records.length !== 1 ? 's' : ''} permanently recorded
          </p>
          <button className={styles.resetButton} onClick={handleDoubleClick}>
            Reset View
          </button>
        </div>

        {records.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="20" cy="32" r="8" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <circle cx="44" cy="32" r="8" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <line x1="28" y1="32" x2="36" y2="32" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" opacity="0.3" />
            </svg>
            <p className={styles.emptyTitle}>No confessions on blockchain yet</p>
            <p className={styles.emptyText}>
              Post a confession and check 'Add to blockchain' to see it appear here
            </p>
          </div>
        ) : (
          <div className={styles.graphContainer}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              onWheel={handleWheel}
              onMouseDown={handleBackgroundMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              style={{ 
                cursor: isPanning ? 'grabbing' : 'grab',
                opacity: isSettled ? 1 : 0.3,
                transition: 'opacity 0.5s ease',
              }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill={colors.primary} opacity="0.5" />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Draw edges */}
                {edges.map((edge, i) => {
                  if (edge.selfLoop) {
                    // Self-loop for isolated node
                    const node = edge.from;
                    const loopRadius = 40;
                    return (
                      <g key={`edge-${i}`}>
                        <path
                          d={`M ${node.x + 28} ${node.y} 
                              A ${loopRadius} ${loopRadius} 0 1 1 ${node.x} ${node.y + 28}`}
                          fill="none"
                          stroke={colors.primary}
                          strokeWidth="1.5"
                          opacity="0.35"
                          markerEnd="url(#arrowhead)"
                        />
                        <text
                          x={node.x + 35}
                          y={node.y + 35}
                          fontSize="9"
                          fill={colors.textMuted}
                          textAnchor="middle"
                        >
                          ON_CHAIN
                        </text>
                      </g>
                    );
                  }

                  const dx = edge.to.x - edge.from.x;
                  const dy = edge.to.y - edge.from.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const midX = (edge.from.x + edge.to.x) / 2;
                  const midY = (edge.from.y + edge.to.y) / 2;

                  // Shorten line to account for node radius
                  const nodeRadius = edge.to.index === nodes.length - 1 ? 34 : 28;
                  const shortenFactor = (dist - nodeRadius) / dist;
                  const toX = edge.from.x + dx * shortenFactor;
                  const toY = edge.from.y + dy * shortenFactor;

                  return (
                    <g key={`edge-${i}`}>
                      <line
                        x1={edge.from.x}
                        y1={edge.from.y}
                        x2={toX}
                        y2={toY}
                        stroke={colors.primary}
                        strokeWidth="1.5"
                        opacity="0.35"
                        markerEnd="url(#arrowhead)"
                      />
                      <text
                        x={midX}
                        y={midY - 5}
                        fontSize="9"
                        fill={colors.textMuted}
                        textAnchor="middle"
                      >
                        ON_CHAIN
                      </text>
                    </g>
                  );
                })}

                {/* Draw nodes */}
                {nodes.map((node) => {
                  const isNewest = node.index === nodes.length - 1;
                  const isExpanded = expandedNode?.id === node.record.id;
                  const isHighlighted = highlightEntityId && node.record.entity_id === highlightEntityId;
                  const radius = isNewest ? 34 : 28;

                  return (
                    <g key={node.id}>
                      {/* Green pulsing ring for highlighted node */}
                      {isHighlighted && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={radius + 8}
                          fill="none"
                          stroke={colors.success}
                          strokeWidth="3"
                          opacity="0.6"
                          className={styles.highlightRing}
                        />
                      )}
                      
                      {/* Node circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius}
                        fill={isHighlighted ? colors.success : colors.primary}
                        fillOpacity="0.85"
                        stroke={isHighlighted ? colors.success : colors.primary}
                        strokeWidth="2"
                        filter={isNewest || isHighlighted ? 'url(#glow)' : undefined}
                        className={styles.node}
                        style={{
                          cursor: 'pointer',
                        }}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                        onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
                        onMouseLeave={handleNodeMouseLeave}
                        onClick={() => handleNodeClick(node)}
                      />
                      
                      {/* Node label */}
                      <text
                        x={node.x}
                        y={node.y + 5}
                        fontSize="11"
                        fontWeight="bold"
                        fill="white"
                        textAnchor="middle"
                        pointerEvents="none"
                      >
                        #{node.index + 1}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Zoom indicator */}
            <div className={styles.zoomIndicator}>
              {Math.round(zoom * 100)}%
            </div>
          </div>
        )}

        {/* Expanded node details panel */}
        {expandedNode && (
          <div className={styles.detailsPanel}>
            <div className={styles.detailsHeader}>
              <h3 className={styles.detailsTitle}>
                Confession #{records.findIndex(r => r.id === expandedNode.id) + 1}
              </h3>
              <button 
                className={styles.detailsClose}
                onClick={() => setExpandedNode(null)}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.detailsContent}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Entity ID:</span>
                <span className={styles.detailValue}>{expandedNode.entity_id}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Synced At:</span>
                <span className={styles.detailValue}>{formatDate(expandedNode.synced_at)}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Transaction Hash:</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${expandedNode.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.detailLink}
                >
                  {expandedNode.tx_hash}
                </a>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status:</span>
                <span className={styles.detailBadge}>Confirmed on Sepolia</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Position in Chain:</span>
                <span className={styles.detailValue}>
                  {records.findIndex(r => r.id === expandedNode.id) + 1} of {records.length}
                </span>
              </div>
            </div>
            
            <a 
              href={`https://sepolia.etherscan.io/tx/${expandedNode.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.detailsButton}
            >
              View on Etherscan ↗
            </a>
          </div>
        )}

        {/* Tooltip */}
        {hoveredNode && (
          <div 
            className={styles.tooltip}
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 80}px`,
            }}
          >
            <p className={styles.tooltipTitle}>
              Confession #{records.findIndex(r => r.id === hoveredNode.id) + 1}
            </p>
            <p className={styles.tooltipDate}>
              {formatDate(hoveredNode.synced_at)}
            </p>
            <a 
              href={`https://sepolia.etherscan.io/tx/${hoveredNode.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.tooltipLink}
            >
              {formatTxHash(hoveredNode.tx_hash)} ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
