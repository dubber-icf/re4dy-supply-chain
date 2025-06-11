import React, { useState, useEffect, createContext, useContext } from 'react';
import { Loader2, ExternalLink, Expand, Minimize, AlertTriangle, Copy } from 'lucide-react';
import VirtualisedTable from './components/table/VirtualisedTable';
import SankeyVisualization from './components/SankeyVisualization';
import GraphVisualization from './components/GraphVisualization';
import MapVisualization from './components/MapVisualization';
import IPScreenerPanel from './components/IPScreenerPanel';
import HealthCheck from './components/HealthCheck';
import ErrorBoundary from './components/ErrorBoundary';
import ComponentService from './services/ComponentService';
import './App.css';

// Global state context for cross-view synchronization
const AppStateContext = createContext();

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

const AppStateProvider = ({ children }) => {
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [components, setComponents] = useState([]);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [loadingError, setLoadingError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // NOTE: Load all components on app initialization
  useEffect(() => {
    loadAllComponents();
  }, []);

  const loadAllComponents = async () => {
    try {
      setIsLoading(true);
      setLoadingError(null);
      
      const data = await ComponentService.getAllComponents();
      setComponents(data);
      localStorage.setItem('lastComponentFetch', new Date().toISOString());
      
      // NOTE: Expose to window for console verification
      window.RE4DY = { 
        components: data, 
        selectedComponent: null 
      };
      
      console.log('[App] Successfully loaded', data.length, 'components');
    } catch (error) {
      console.error('[App] Failed to load components:', error);
      setLoadingError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectComponent = (component) => {
    setSelectedComponent(component);
    // NOTE: Update window object for console verification
    if (window.RE4DY) {
      window.RE4DY.selectedComponent = component;
    }
    
    // Update highlighted nodes across all visualizations
    if (component) {
      setHighlightedNodes([
        `supplier_${component.supplier_id}`,
        `component_${component.id}`
      ]);
    } else {
      setHighlightedNodes([]);
    }
  };

  const value = {
    selectedComponent,
    components,
    selectComponent,
    highlightedNodes,
    setHighlightedNodes,
    mapMarkers,
    setMapMarkers,
    loadAllComponents,
    loadingError,
    isLoading
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// NOTE: Development banner component for API base URL visibility
const DevBanner = () => {
  const apiBase = ComponentService.getApiBaseUrl();
  const isDev = import.meta.env.DEV;
  
  if (!isDev) return null;
  
  return (
    <div className="bg-red-600 text-white px-4 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span>
          <strong>DEV MODE:</strong> API Base URL: {apiBase}
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(apiBase)}
          className="ml-2 p-1 hover:bg-red-700 rounded"
          title="Copy API URL"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// NOTE: Error fallback component for API connectivity issues
const ApiErrorFallback = ({ error, onRetry }) => {
  const apiBase = ComponentService.getApiBaseUrl();
  const failingUrl = `${apiBase}/components`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(failingUrl);
  };
  
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Backend offline. Check RE4DY_API_BASE.
        </h2>
        <p className="text-gray-600 mb-4">
          Failed to fetch: {failingUrl}
        </p>
        <div className="flex flex-col space-y-2">
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy failing URL
          </button>
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Loader2 className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [activeView, setActiveView] = useState('table');
  const [isExpanded, setIsExpanded] = useState(false);

  // NOTE: Check for health route with debug parameter
  if (window.location.pathname === '/health') {
    return (
      <AppStateProvider>
        <HealthCheck />
      </AppStateProvider>
    );
  }

  const renderVisualization = () => {
    switch (activeView) {
      case 'table':
        return <VirtualisedTable />;
      case 'sankey':
        return <SankeyVisualization />;
      case 'graph':
        return <GraphVisualization />;
      case 'map':
        return <MapVisualization />;
      default:
        return <VirtualisedTable />;
    }
  };

  return (
    <AppStateProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          {/* Development Banner */}
          <DevBanner />
          
          {/* Industry Commons Foundation Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Official ICF Logo */}
                <a 
                  href="https://industrycommons.net" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <img 
                    src="/assets/icf-logo.png" 
                    alt="Industry Commons Foundation"
                    className="h-8 w-auto"
                  />
                </a>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Supply Chain Visualiser</h1>
                  <p className="text-sm text-gray-600">
                    Interactive supply chain visualisation with IPScreener patent & innovation insights
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* NOTE: Hide Health Check link for normal users, show only in debug mode */}
                {new URLSearchParams(window.location.search).get('debug') === '1' && (
                  <a 
                    href="/health"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                    title="System Health Check"
                  >
                    Health Check
                  </a>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isExpanded ? "Collapse View" : "Expand View"}
                >
                  {isExpanded ? <Minimize className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </header>

          <AppContent 
            activeView={activeView}
            setActiveView={setActiveView}
            isExpanded={isExpanded}
            renderVisualization={renderVisualization}
          />
        </div>
      </ErrorBoundary>
    </AppStateProvider>
  );
}

// NOTE: Separate component for main content to access AppState context
const AppContent = ({ activeView, setActiveView, isExpanded, renderVisualization }) => {
  const { loadingError, isLoading, loadAllComponents } = useAppState();

  // NOTE: Show API error fallback if there's a loading error
  if (loadingError && !isLoading) {
    return <ApiErrorFallback error={loadingError} onRetry={loadAllComponents} />;
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${isExpanded ? 'w-full' : ''}`}>
        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Visualization Type Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveView('table')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Table
              </button>
              <button
                onClick={() => setActiveView('sankey')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'sankey'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📈 Sankey
              </button>
              <button
                onClick={() => setActiveView('graph')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'graph'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🕸️ Graph
              </button>
              <button
                onClick={() => setActiveView('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'map'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🗺️ Map
              </button>
            </div>
          </div>
        </div>

        {/* Visualization Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {renderVisualization()}
        </div>
      </div>

      {/* IP Screener Panel */}
      {!isExpanded && (
        <div className="w-80 bg-white border-l border-gray-200">
          <IPScreenerPanel />
        </div>
      )}
    </div>
  );
};

export default App;

