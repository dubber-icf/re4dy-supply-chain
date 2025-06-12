import React, { useState, useEffect, createContext, useContext } from 'react';
import { Loader2, ExternalLink, Expand, Minimize, AlertTriangle, Copy } from 'lucide-react';
import VirtualisedTable from './components/table/VirtualisedTable';
import SankeyVisualization from './components/SankeyVisualization';
import GraphVisualization from './components/GraphVisualization';
import IPScreenerPanel from './components/IPScreenerPanel';
import HealthCheck from './components/HealthCheck';
import ComponentService from './services/ComponentService';
import './App.css';

// Add near the top of your App component function
React.useEffect(() => {
  console.log('App environment variables:');
  console.log('VITE_RE4DY_API_BASE:', import.meta.env.VITE_RE4DY_API_BASE);
  console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
}, []);


// Global state context
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
  const [loadingError, setLoadingError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ipScreenerResults, setIpScreenerResults] = useState(null);

  useEffect(() => {
    loadAllComponents();
  }, []);

  const loadAllComponents = async () => {
    try {
      setIsLoading(true);
      setLoadingError(null);
      
      console.log('[App] Loading components...');
      const data = await ComponentService.getAllComponents();
      console.log('[App] Loaded components:', data);
      
      setComponents(data);
      
      // Expose to window for debugging
      window.RE4DY = { 
        components: data, 
        selectedComponent: null,
        apiBase: ComponentService.getApiBaseUrl()
      };
      
    } catch (error) {
      console.error('[App] Failed to load components:', error);
      setLoadingError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectComponent = (component) => {
    setSelectedComponent(component);
    if (window.RE4DY) {
      window.RE4DY.selectedComponent = component;
    }
  };

  const value = {
    selectedComponent,
    components,
    selectComponent,
    loadAllComponents,
    loadingError,
    isLoading,
    ipScreenerResults,
    setIpScreenerResults
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Development banner
const DevBanner = () => {
  const apiBase = ComponentService.getApiBaseUrl();
  const isDev = import.meta.env.DEV;
  
  if (!isDev) return null;
  
  return (
    <div className="bg-red-600 text-white px-4 py-2 text-sm flex items-center justify-between">
      <span><strong>DEV MODE:</strong> API Base URL: {apiBase}</span>
      <button
        onClick={() => navigator.clipboard.writeText(apiBase)}
        className="ml-2 p-1 hover:bg-red-700 rounded"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
};

// Error fallback
const ApiErrorFallback = ({ error, onRetry }) => {
  const apiBase = ComponentService.getApiBaseUrl();
  const failingUrl = `${apiBase}/components`;
  
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Backend offline. Check RE4DY_API_BASE.
        </h2>
        <p className="text-gray-600 mb-4 break-all">
          Failed to fetch: {failingUrl}
        </p>
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => navigator.clipboard.writeText(failingUrl)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Copy className="w-4 h-4 mr-2 inline" />
            Copy failing URL
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Loader2 className="w-4 h-4 mr-2 inline" />
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

  // Health check route
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
      default:
        return <VirtualisedTable />;
    }
  };

  return (
    <AppStateProvider>
      <div className="min-h-screen bg-gray-50">
        <DevBanner />
        
        {/* Header with ICF Logo */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* ICF Logo */}
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
                  onError={(e ) => {
                    console.error('ICF logo failed to load');
                    e.target.style.display = 'none';
                  }}
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
              {/* Hide Health Check unless debug mode */}
              {new URLSearchParams(window.location.search).get('debug') === '1' && (
                <a 
                  href="/health"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Health Check
                </a>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
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
    </AppStateProvider>
  );
}

const AppContent = ({ activeView, setActiveView, isExpanded, renderVisualization }) => {
  const { loadingError, isLoading, loadAllComponents } = useAppState();

  if (loadingError && !isLoading) {
    return <ApiErrorFallback error={loadingError} onRetry={loadAllComponents} />;
  }

  return (
    <div className="h-[calc(100vh-120px)]">
      {/* Two-column layout: ⅔ data visualization / ⅓ IP Screener */}
      <div className={`grid h-full ${isExpanded ? 'grid-cols-1' : 'grid-cols-[2fr_1fr]'} max-w-[1600px] mx-auto`}>
        
        {/* Main Content Area */}
        <div className="flex flex-col bg-white border-r border-gray-200">
          {/* Navigation Tabs - REMOVED MAP BUTTON */}
          <div className="border-b border-gray-200 px-6 py-4">
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
              {/* MAP BUTTON REMOVED - Map is now inside IP Screener panel */}
            </div>
          </div>

          {/* Visualization Content */}
          <div className="flex-1 p-6 overflow-hidden">
            {renderVisualization()}
          </div>
        </div>

        {/* IP Screener Panel - ⅓ width */}
        {!isExpanded && (
          <div className="bg-white flex flex-col">
            <IPScreenerPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
