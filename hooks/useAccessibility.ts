import { useEffect, useRef, useCallback } from 'react';
import { UI_CONSTANTS } from '../constants';

// NOTE: Custom hooks for accessibility without external dependencies
// Provides focus management and keyboard navigation

export function useFocusManagement() {
  const focusTimeoutRef = useRef<NodeJS.Timeout>();

  const moveFocusToResults = useCallback((targetElement?: HTMLElement | null) => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = setTimeout(() => {
      if (targetElement) {
        targetElement.focus();
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }, UI_CONSTANTS.FOCUS_DELAY);
  }, []);

  const clearFocusTimeout = useCallback(() => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  return {
    moveFocusToResults,
    clearFocusTimeout
  };
}

export function useKeyboardNavigation(
  onNext?: () => void,
  onPrevious?: () => void,
  onEscape?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        // Allow Escape in input fields
        if (event.key === UI_CONSTANTS.SHORTCUTS.ESCAPE && onEscape) {
          onEscape();
        }
        return;
      }

      switch (event.key) {
        case UI_CONSTANTS.SHORTCUTS.NEXT_COMPONENT:
          event.preventDefault();
          onNext?.();
          break;
        case UI_CONSTANTS.SHORTCUTS.PREVIOUS_COMPONENT:
          event.preventDefault();
          onPrevious?.();
          break;
        case UI_CONSTANTS.SHORTCUTS.ESCAPE:
          event.preventDefault();
          onEscape?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onEscape]);
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// NOTE: Hook for managing ARIA live regions
export function useAriaLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
      
      // Clear after announcement to allow repeated messages
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const LiveRegion = useCallback(() => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  ), []);

  return {
    announce,
    LiveRegion
  };
}

// OPTIONAL: When axe-core is available, add accessibility testing:
// import axe from 'axe-core';
// 
// export function useAccessibilityTesting() {
//   useEffect(() => {
//     if (process.env.NODE_ENV === 'development') {
//       axe.run(document).then(results => {
//         if (results.violations.length > 0) {
//           console.group('Accessibility Violations');
//           results.violations.forEach(violation => {
//             console.error(violation.description, violation.nodes);
//           });
//           console.groupEnd();
//         }
//       });
//     }
//   }, []);
// }

