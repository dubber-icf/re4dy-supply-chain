import React, {
  useState, useEffect, useRef, useMemo, useCallback
} from 'react';
import {
  Loader2, AlertCircle, RefreshCw, Search,
  Maximize2, Minimize2
} from 'lucide-react';

import { useAppState } from '../../App';
import ComponentService from '../../services/ComponentService';

import { useVirtualScroll, useDebounce, useScrollToItem } from '../../hooks/useVirtualScroll';
import { useFocusManagement } from '../../hooks/useFocusManagement';

import { LoadingBar }   from '../ui/LoadingBar';
import { StatusBanner } from '../ui/StatusBanner';

/* -- constants ---------------------------------------------------------- */
const ROW_HEIGHT                = 48;
const DEFAULT_CONTAINER_HEIGHT  = 400;
const EXPANDED_CONTAINER_HEIGHT = 600;

/* ======================================================================= */
/*  VIRTUALISED TABLE                                                     */
/* ======================================================================= */
export default function VirtualisedTable () {
  /* ------------ state ------------- */
  const [components,   setComponents]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [isExpanded,   setIsExpanded]   = useState(false);
  const [scrollTop,    setScrollTop]    = useState(0);

  /* banner status */
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType,    setStatusType]    = useState('info');   // info | loading | success | error
  const [showStatus,    setShowStatus]    = useState(false);

  /* ------------ refs / context ----- */
  const containerRef = useRef(null);
  const { selectedComponent, selectComponent } = useAppState();
  const { moveFocusToResults } = useFocusManagement();

  /* ------------ helpers ------------ */
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const containerHeight     = isExpanded
    ? EXPANDED_CONTAINER_HEIGHT
    : DEFAULT_CONTAINER_HEIGHT;

  const scrollToItem = useScrollToItem(containerRef);

  /* ------------ lifecycle ---------- */
  useEffect(() => { loadComponents(); }, []);

  /* focus selected row when changed in other views */
  useEffect(() => {
    if (!selectedComponent || components.length === 0) return;

    const index = filteredComponents.findIndex(
      c => c.id === selectedComponent.id
    );
    if (index >= 0) scrollToItem(index, ROW_HEIGHT);
  }, [selectedComponent, components, scrollToItem]);

  /* ===================================================================== */
/*  DATA LOADING                                                         */
/* ===================================================================== */
async function loadComponents () {
  try {
    setLoading(true);
    setError(null);
    setShowStatus(true);
    setStatusMessage('Loading components…');
    setStatusType('loading');

    /* ---------- API CALL ---------- */
    const payload = await ComponentService.getAllComponents();

    /* Accept any of the common shapes we might get back */
    const list =
      Array.isArray(payload)               ? payload :
      Array.isArray(payload?.data)         ? payload.data :
      Array.isArray(payload?.components)   ? payload.components :
      [];

    console.log('[VirtualisedTable] list length', list.length, 'raw payload', payload);

    setComponents(list);
    setStatusType('success');
    setStatusMessage(`Loaded ${list.length} components`);
    setTimeout(() => setShowStatus(false), 3000);

  } catch (err) {
    console.error('[VirtualisedTable] loadComponents error:', err);
    setError(err.message ?? 'Unknown error');
    setStatusType('error');
    setStatusMessage(`Failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

  /* ===================================================================== */
  /*  FILTER & VIRTUAL SCROLL                                              */
  /* ===================================================================== */
  const filteredComponents = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return components;

    const term = debouncedSearchTerm.toLowerCase();
    return components.filter(c =>
      (c.part_name         || '').toLowerCase().includes(term) ||
      (c.part_number       || '').toLowerCase().includes(term) ||
      (c.original_supplier || '').toLowerCase().includes(term) ||
      (c.category_name     || '').toLowerCase().includes(term)
    );
  }, [components, debouncedSearchTerm]);

  const {
    visibleItems, totalHeight, offsetY
  } = useVirtualScroll({
    itemCount:       filteredComponents.length,
    itemHeight:      ROW_HEIGHT,
    containerHeight,
    scrollTop,
    overscan:        5
  });

  const handleScroll = useCallback(e => setScrollTop(e.target.scrollTop), []);

  const handleComponentSelect = useCallback((component, index) => {
    selectComponent(component);
    window.RE4DY && (window.RE4DY.selectedComponent = component);
  }, [selectComponent]);

  const handleKeyDown = useCallback((e, component, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleComponentSelect(component, index);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.target.parentElement?.nextElementSibling
        ?.querySelector('[role="row"]')
        ?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.target.parentElement?.previousElementSibling
        ?.querySelector('[role="row"]')
        ?.focus();
    }
  }, [handleComponentSelect]);

  const formatPrice = (min, max, currency = 'EUR') => {
    if (!min && !max)       return 'Price on request';
    if (min && max)         return `${currency}${min}-${currency}${max}`;
    if (min)                return `${currency}${min}+`;
    return `Up to ${currency}${max}`;
  };

  /* ===================================================================== */
  /*  RENDER                                                               */
  /* ===================================================================== */

  /* ---- loading & error states ---------------------------------------- */
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Loading components…</h3>
          <p className="text-sm text-gray-500">Fetching complete dataset…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to Load Components
          </h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadComponents}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ---- main table ---------------------------------------------------- */
  return (
    <>
      <LoadingBar  isLoading={loading} />
      <StatusBanner
        type={statusType}
        message={statusMessage}
        isVisible={showStatus}
        onDismiss={() => setShowStatus(false)}
      />

      {/* wrapper for rounded corners */}
      <div className={`bg-white rounded-lg border overflow-hidden ${isExpanded ? 'h-full' : ''}`}>

        {/* header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Supply-Chain Components
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredComponents.length} of {components.length} components
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title={isExpanded ? 'Minimise' : 'Expand'}
              >
                {isExpanded
                  ? <Minimize2 className="w-5 h-5" />
                  : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={loadComponents}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search components, part numbers, suppliers…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* fixed column headers */}
        <div className="bg-gray-100 border-b px-6 py-3 sticky top-0 z-10">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700" role="row">
            <div className="col-span-3">Component Name</div>
            <div className="col-span-2">Part Number</div>
            <div className="col-span-2">Supplier</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price Range</div>
            <div className="col-span-1">Actions</div>
          </div>
        </div>

        {/* scroll container */}
        <div
          ref={containerRef}
          className="overflow-auto"
          style={{ height: containerHeight }}
          onScroll={handleScroll}
          role="grid"
          aria-label="Components table"
          aria-rowcount={filteredComponents.length}
        >
          {/* virtual space */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleItems.map(index => {
                const component = filteredComponents[index];
                if (!component) return null;

                const isSelected = selectedComponent?.id === component.id;

                return (
                  <div
                    key={component.id}
                    className={`grid grid-cols-12 gap-4 px-6 py-3 border-b hover:bg-gray-50 cursor-pointer ${
                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => handleComponentSelect(component, index)}
                    onKeyDown={e => handleKeyDown(e, component, index)}
                    role="row"
                    tabIndex={0}
                    aria-rowindex={index + 1}
                    aria-selected={isSelected}
                  >
                    <div className="col-span-3">
                      <div className="font-medium truncate">{component.part_name}</div>
                      <div className="text-sm text-gray-500 truncate">{component.subcategory}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm font-mono">{component.part_number}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm">{component.original_supplier}</div>
                      <div className="text-xs text-gray-500">{component.supplier_country}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm">{component.category_name}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm">
                        {formatPrice(component.price_min, component.price_max, component.currency)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleComponentSelect(component, index);
                        }}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Analyse
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-600 flex justify-between">
          <span>
            {filteredComponents.length === components.length
              ? `${components.length} components total`
              : `${filteredComponents.length} of ${components.length} components (filtered)`}
          </span>
          {selectedComponent && (
            <span className="text-blue-600 font-medium">
              Selected: {selectedComponent.part_name}
            </span>
          )}
        </div>
      </div>
    </>
  );
}