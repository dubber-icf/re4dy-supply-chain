import React, {
  useState,
  useEffect,
  createContext,
  useContext
} from 'react';

import VirtualisedTable from './components/table/VirtualisedTable';
import SankeyVisualization from './components/SankeyVisualization';
import GraphVisualization from './components/GraphVisualization';
import IPScreenerPanel from './components/IPScreenerPanel';
import ComponentService from './services/ComponentService';

/* ---------- context & hook ---------- */

const AppStateContext = createContext(null);

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx)
    throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
};

const AppStateProvider = ({ children }) => {
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await ComponentService.getAllComponents();
        setComponents(data);
      } catch (e) {
        setError(e.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppStateContext.Provider
      value={{ components, selectedComponent, setSelectedComponent, loading, error }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

/* ---------- main component ---------- */

export default function App() {
  const [view, setView] = useState('table');

  const renderView = () => {
    switch (view) {
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
      {/* very simple nav – adapt as needed */}
      <nav className="flex space-x-2 p-4">
        {['table', 'sankey', 'graph'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 rounded ${view === v ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {v}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-[2fr_1fr] h-[calc(100vh-60px)]">
        <section className="overflow-hidden">{renderView()}</section>
        <aside className="border-l overflow-auto">
          <IPScreenerPanel />
        </aside>
      </div>
    </AppStateProvider>
  );
}