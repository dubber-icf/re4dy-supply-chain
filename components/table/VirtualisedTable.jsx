import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, Search, Maximize2, Minimize2 } from 'lucide-react';
import { useAppState } from '../../App';
import { useVirtualScroll, useDebounce, useScrollToItem } from '../../hooks/useVirtualScroll';
import { LoadingBar } from '../ui/LoadingBar';
import { StatusBanner } from '../ui/StatusBanner';
import { useFocusManagement } from '../../hooks/useFocusManagement';

// NOTE: Row height in pixels for consistent virtual scrolling calculations
const ROW_HEIGHT = 48;
// NOTE: Default container height, expandable for better visibility
const DEFAULT_CONTAINER_HEIGHT = 400;
const EXPANDED_CONTAINER_HEIGHT = 600;

const VirtualisedTable = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [showStatus, setShowStatus] = useState(false);
  
  const containerRef = useRef(null);
  const { selectedComponent, selectComponent } = useAppState();
  const { moveFocusToResults } = useFocusManagement();
  
  // NOTE: Debounce search input to prevent excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  
  const containerHeight = isExpanded ? EXPANDED_CONTAINER_HEIGHT : DEFAULT_CONTAINER_HEIGHT;
  const scrollToItem = useScrollToItem(containerRef);

  useEffect(() => {
    loadComponents();
  }, []);

  // NOTE: Scroll to selected component when changed from other views
  useEffect(() => {
    if (selectedComponent && components.length > 0) {
      const index = filteredComponents.findIndex(comp => comp.id === selectedComponent.id);
      if (index >= 0) {
        scrollToItem(index, ROW_HEIGHT);
      }
    }
  }, [selectedComponent, components, scrollToItem]);

  const loadComponents = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatusMessage('Loading components...');
      setStatusType('loading');
      setShowStatus(true);
      
      // NOTE: Fetch all components without pagination limit
      const response = await fetch('http://localhost:5000/api/components');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'API returned error response');
      }

      setComponents(data.components || []);
      setStatusMessage(`Successfully loaded ${data.components?.length || 0} components`);
      setStatusType('success');
      
      // NOTE: Auto-hide success message after 3 seconds
      setTimeout(() => setShowStatus(false), 3000);
      
    } catch (err) {
      console.error('Error loading components:', err);
      setError(err.message);
      setStatusMessage(`Failed to load components: ${err.message}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  // Filter components based on debounced search term
  const filteredComponents = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return components;
    
    const term = debouncedSearchTerm.toLowerCase();
    return components.filter(component => 
      component.part_name?.toLowerCase().includes(term) ||
      component.part_number?.toLowerCase().includes(term) ||
      component.original_supplier?.toLowerCase().includes(term) ||
      component.category_name?.toLowerCase().includes(term)
    );
  }, [components, debouncedSearchTerm]);

  // Virtual scrolling calculations
  const { visibleItems, totalHeight, offsetY } = useVirtualScroll({
    itemCount: filteredComponents.length,
    itemHeight: ROW_HEIGHT,
    containerHeight,
    scrollTop,
    overscan: 5
  });

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const handleComponentSelect = useCallback((component, index) => {
    selectComponent(component);
    // NOTE: Store selection for cross-view synchronization
    console.log(`Selected component ${component.id} at index ${index}`);
  }, [selectComponent]);

  const handleKeyDown = useCallback((e, component, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleComponentSelect(component, index);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = e.target.parentElement?.nextElementSibling?.querySelector('[role="row"]');
      nextRow?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = e.target.parentElement?.previousElementSibling?.querySelector('[role="row"]');
      prevRow?.focus();
    }
  }, [handleComponentSelect]);

  const formatPrice = (min, max, currency = 'EUR') => {
    if (!min && !max) return 'Price on request';
    if (min && max) return `${currency}${min}-${currency}${max}`;
    if (min) return `${currency}${min}+`;
    return `Up to ${currency}${max}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Loading components…</h3>
          <p className="text-sm text-gray-500">Fetching complete dataset...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Components</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadComponents}
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
    <>
      {/* Loading Bar */}
      <LoadingBar isLoading={loading} />
      
      {/* Status Banner */}
      <StatusBanner
        type={statusType}
        message={statusMessage}
        isVisible={showStatus}
        onDismiss={() => setShowStatus(false)}
      />
      
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${isExpanded ? 'h-full' : ''}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Supply Chain Components</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredComponents.length} of {components.length} components
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={loadComponents}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search components, part numbers, suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search components"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="relative">
        {/* Fixed Header */}
        <div className="bg-gray-100 border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700" role="row">
            <div className="col-span-3" role="columnheader">Component Name</div>
            <div className="col-span-2" role="columnheader">Part Number</div>
            <div className="col-span-2" role="columnheader">Supplier</div>
            <div className="col-span-2" role="columnheader">Category</div>
            <div className="col-span-2" role="columnheader">Price Range</div>
            <div className="col-span-1" role="columnheader">Actions</div>
          </div>
        </div>

        {/* Virtual Scrolling Container */}
        <div
          ref={containerRef}
          className="overflow-auto"
          style={{ height: containerHeight }}
          onScroll={handleScroll}
          role="grid"
          aria-label="Components table"
          aria-rowcount={filteredComponents.length}
        >
          {/* Virtual spacer */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleItems.map((index) => {
                const component = filteredComponents[index];
                if (!component) return null;
                
                const isSelected = selectedComponent?.id === component.id;
                
                return (
                  <div
                    key={component.id}
                    className={`grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => handleComponentSelect(component, index)}
                    onKeyDown={(e) => handleKeyDown(e, component, index)}
                    role="row"
                    tabIndex={0}
                    aria-rowindex={index + 1}
                    aria-selected={isSelected}
                  >
                    <div className="col-span-3" role="gridcell" aria-colindex={1}>
                      <div className="font-medium text-gray-900 truncate">
                        {component.part_name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {component.subcategory}
                      </div>
                    </div>
                    <div className="col-span-2" role="gridcell" aria-colindex={2}>
                      <div className="text-sm font-mono text-gray-700">
                        {component.part_number}
                      </div>
                    </div>
                    <div className="col-span-2" role="gridcell" aria-colindex={3}>
                      <div className="text-sm text-gray-900">
                        {component.original_supplier}
                      </div>
                      <div className="text-xs text-gray-500">
                        {component.supplier_country}
                      </div>
                    </div>
                    <div className="col-span-2" role="gridcell" aria-colindex={4}>
                      <div className="text-sm text-gray-700">
                        {component.category_name}
                      </div>
                    </div>
                    <div className="col-span-2" role="gridcell" aria-colindex={5}>
                      <div className="text-sm text-gray-700">
                        {formatPrice(component.price_min, component.price_max, component.currency)}
                      </div>
                    </div>
                    <div className="col-span-1" role="gridcell" aria-colindex={6}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComponentSelect(component, index);
                        }}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                        aria-label={`Analyze ${component.part_name}`}
                      >
                        Analyze
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredComponents.length === components.length 
              ? `${components.length} components total`
              : `${filteredComponents.length} of ${components.length} components (filtered)`
            }
          </span>
          {selectedComponent && (
            <span className="text-blue-600 font-medium">
              Selected: {selectedComponent.part_name}
            </span>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default VirtualisedTable;

