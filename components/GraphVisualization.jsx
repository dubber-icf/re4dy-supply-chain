import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Loader2, AlertCircle, RefreshCw, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useAppState } from '../App';

const GraphVisualization = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();
  const { selectedComponent, selectComponent, highlightedNodes } = useAppState();

  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load nodes and relationships
    const apiBase = import.meta.env.VITE_RE4DY_API_BASE || import.meta.env.VITE_API_URL || '';
    const [nodesResponse, relationshipsResponse] = await Promise.all([
      fetch(`${apiBase}/relationships/nodes`),
      fetch(`${apiBase}/relationships`)
      ]);

      if (!nodesResponse.ok || !relationshipsResponse.ok) {
        throw new Error('Failed to fetch graph data');
      }

      const nodesData = await nodesResponse.json();
      const relationshipsData = await relationshipsResponse.json();

      if (!nodesData.success || !relationshipsData.success) {
        throw new Error('API returned error response');
      }

      // Format nodes for react-force-graph-2d
      const nodes = nodesData.nodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        country: node.country,
        group: node.group,
        original_id: node.original_id,
        // Visual properties
        color: getNodeColor(node.type),
        size: getNodeSize(node.type),
        label: node.name
      }));

      // Format links for react-force-graph-2d
      const links = relationshipsData.relationships.map(rel => ({
        source: `${rel.source_type}_${rel.source_id}`,
        target: `${rel.target_type}_${rel.target_id}`,
        value: rel.value,
        relationship_type: rel.relationship_type,
        // Visual properties
        color: getLinkColor(rel.relationship_type),
        width: Math.max(1, rel.value * 2)
      }));

      setGraphData({ nodes, links });
    } catch (err) {
      console.error('Error loading graph data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (type) => {
    switch (type) {
      case 'supplier': return '#3B82F6'; // Blue
      case 'component': return '#10B981'; // Green
      case 'manufacturer': return '#8B5CF6'; // Purple
      default: return '#6B7280'; // Gray
    }
  };

  const getNodeSize = (type) => {
    switch (type) {
      case 'supplier': return 8;
      case 'component': return 6;
      case 'manufacturer': return 10;
      default: return 5;
    }
  };

  const getLinkColor = (relationshipType) => {
    switch (relationshipType) {
      case 'supplies': return '#10B981';
      case 'manufactures': return '#F59E0B';
      case 'assembles': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    
    // Cross-view synchronization - find corresponding component
    if (node.type === 'component') {
      // This would require mapping back to the original component data
      // For now, we'll just highlight the node
      console.log('Graph node clicked:', node);
    }
  };

  const handleNodeHover = (node) => {
    // Highlight connected nodes
    if (node) {
      const connectedNodeIds = graphData.links
        .filter(link => link.source.id === node.id || link.target.id === node.id)
        .map(link => link.source.id === node.id ? link.target.id : link.source.id);
      
      // Update node highlighting
      setGraphData(prevData => ({
        ...prevData,
        nodes: prevData.nodes.map(n => ({
          ...n,
          highlighted: n.id === node.id || connectedNodeIds.includes(n.id)
        }))
      }));
    } else {
      // Clear highlighting
      setGraphData(prevData => ({
        ...prevData,
        nodes: prevData.nodes.map(n => ({ ...n, highlighted: false }))
      }));
    }
  };

  const zoomToFit = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  };

  const resetView = () => {
    if (fgRef.current) {
      fgRef.current.zoom(1);
      fgRef.current.centerAt(0, 0);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Loading Supply Chain Network</h3>
          <p className="text-sm text-gray-500">Building force-directed graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Network Graph</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadGraphData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Supply Chain Network</h2>
            <p className="text-sm text-gray-600 mt-1">
              {graphData.nodes.length} nodes, {graphData.links.length} connections
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomToFit}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom to Fit"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={resetView}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={loadGraphData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className="h-[calc(100%-140px)] relative">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeId="id"
          nodeLabel="name"
          nodeColor={node => node.highlighted ? '#EF4444' : node.color}
          nodeRelSize={6}
          nodeVal={node => node.size}
          linkColor={link => link.color}
          linkWidth={link => link.width}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onLinkHover={() => {}} // Prevent link hover interference
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          cooldownTicks={100}
          onEngineStop={() => fgRef.current?.zoomToFit(400)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            // Custom node rendering with labels
            const label = node.name;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Draw node circle
            ctx.fillStyle = node.highlighted ? '#EF4444' : node.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI, false);
            ctx.fill();
            
            // Draw label if zoom level is sufficient
            if (globalScale > 1.5) {
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
              
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
              
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#333';
              ctx.fillText(label, node.x, node.y);
            }
          }}
        />
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Suppliers</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Components</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">Manufacturers</span>
            </div>
          </div>
          <span className="text-xs text-gray-500">
            Drag nodes • Scroll to zoom • Click to select
          </span>
        </div>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute top-20 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
          <h4 className="font-medium text-gray-900 mb-2">{selectedNode.name}</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div><span className="font-medium">Type:</span> {selectedNode.type}</div>
            <div><span className="font-medium">Country:</span> {selectedNode.country}</div>
            <div><span className="font-medium">ID:</span> {selectedNode.id}</div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-3 text-xs text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;

