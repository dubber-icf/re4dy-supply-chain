import { useState, useEffect, useMemo, useCallback } from 'react';

// NOTE: Custom virtual scrolling hook to avoid external dependencies
// Manages viewport calculations and visible item ranges for performance
export const useVirtualScroll = ({
  itemCount,
  itemHeight,
  containerHeight,
  scrollTop,
  overscan = 5
}) => {
  // NOTE: Calculate visible range with overscan for smooth scrolling
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push(i);
    }
    return items;
  }, [startIndex, endIndex]);

  const totalHeight = itemCount * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight,
    offsetY
  };
};

// NOTE: Debounced search hook to prevent excessive re-renders
// 200ms delay balances responsiveness with performance
export const useDebounce = (value, delay = 200) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// NOTE: Scroll to item hook for cross-view synchronization
export const useScrollToItem = (containerRef) => {
  const scrollToItem = useCallback((index, itemHeight = 48) => {
    if (!containerRef?.current) return;
    
    const container = containerRef.current;
    const targetScrollTop = index * itemHeight;
    
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }, [containerRef]);

  return scrollToItem;
};

