import React, { useState, useEffect } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppState } from '../App';

const SankeyVisualization = () => {
  const [sankeyData, setSankeyData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { selectedComponent, selectComponent } = useAppState();

  useEffect(() => {
    loadSankeyData();
  }, []);

  const loadSankeyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiBase = import.meta.env.VITE_RE4DY_API_BASE || import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/relationships/sankey`); 
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSankeyData({
          nodes: data.nodes,
          links: data.links
        });
      } else {
        throw new Error(data.error || 'Failed to load Sankey data');
      }
    } catch (err) {
      console.error('Error loading Sankey data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node) => {
    console.log('Sankey node clicked:', node);
    // NOTE: Cross-view synchronization - find corresponding component
    // This would require mapping node IDs back to component data
    // For now, we'll implement basic node highlighting
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Loading Supply Chain Flow</h3>
          <p className="text-sm text-gray-500">Fetching relationship data from database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Sankey Diagram</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadSankeyData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!sankeyData.nodes.length || !sankeyData.links.length) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Supply Chain Data</h3>
          <p className="text-sm text-gray-500">No relationships found to visualize</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Supply Chain Flow</h2>
            <p className="text-sm text-gray-600 mt-1">
              {sankeyData.nodes.length} nodes, {sankeyData.links.length} relationships
            </p>
          </div>
          <button
            onClick={loadSankeyData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sankey Diagram */}
      <div className="h-[calc(100%-80px)]">
        <ResponsiveSankey
          data={sankeyData}
          margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
          align="justify"
          colors={{ scheme: 'category10' }}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={18}
          nodeSpacing={24}
          nodeBorderWidth={0}
          nodeBorderColor={{
            from: 'color',
            modifiers: [['darker', 0.8]]
          }}
          linkOpacity={0.5}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          enableLinkGradient={true}
          labelPosition="outside"
          labelOrientation="vertical"
          labelPadding={16}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 1]]
          }}
          onClick={handleNodeClick}
          animate={true}
          motionConfig="gentle"
          // Custom node and link styling for automotive supply chain
          theme={{
            labels: {
              text: {
                fontSize: 12,
                fontWeight: 500
              }
            },
            tooltip: {
              container: {
                background: 'white',
                color: 'black',
                fontSize: '12px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }
            }
          }}
          tooltip={({ node, link }) => {
            if (node) {
              return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-medium text-gray-900">{node.id}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Value: {node.value?.toFixed(2) || 'N/A'}
                  </div>
                </div>
              );
            }
            if (link) {
              return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-medium text-gray-900">
                    {link.source.id} → {link.target.id}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Flow: {link.value?.toFixed(2) || 'N/A'}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Click nodes to explore relationships</span>
          <span>Flow direction: Supplier → Component → Manufacturer</span>
        </div>
      </div>
    </div>
  );
};

export default SankeyVisualization;

