import { useEffect, useRef } from 'react';

// NOTE: Custom hook for managing focus after async operations
// Moves focus to specified element after completion for accessibility
export const useFocusManagement = () => {
  const focusRef = useRef<HTMLElement | null>(null);

  const setFocusTarget = (element: HTMLElement | null) => {
    focusRef.current = element;
  };

  const moveFocusToTarget = () => {
    if (focusRef.current) {
      focusRef.current.focus();
      // NOTE: Scroll into view if needed
      focusRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  };

  const moveFocusToResults = () => {
    // NOTE: After Analyse completes, move focus to patent results heading
    const resultsHeading = document.querySelector('[data-focus-target="results"]') as HTMLElement;
    if (resultsHeading) {
      resultsHeading.focus();
      resultsHeading.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  };

  return {
    setFocusTarget,
    moveFocusToTarget,
    moveFocusToResults
  };
};

// NOTE: Custom hook for keyboard navigation in virtual lists
export const useKeyboardNavigation = (
  itemCount: number,
  onSelect: (index: number) => void,
  isEnabled: boolean = true
) => {
  const currentIndex = useRef<number>(-1);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        currentIndex.current = Math.min(currentIndex.current + 1, itemCount - 1);
        focusItem(currentIndex.current);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        currentIndex.current = Math.max(currentIndex.current - 1, 0);
        focusItem(currentIndex.current);
        break;
        
      case 'Home':
        event.preventDefault();
        currentIndex.current = 0;
        focusItem(currentIndex.current);
        break;
        
      case 'End':
        event.preventDefault();
        currentIndex.current = itemCount - 1;
        focusItem(currentIndex.current);
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentIndex.current >= 0) {
          onSelect(currentIndex.current);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        // NOTE: Clear selection and return focus to container
        currentIndex.current = -1;
        const container = document.querySelector('[role="grid"]') as HTMLElement;
        container?.focus();
        break;
    }
  };

  const focusItem = (index: number) => {
    const item = document.querySelector(`[data-row-index="${index}"]`) as HTMLElement;
    if (item) {
      item.focus();
    }
  };

  useEffect(() => {
    if (isEnabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEnabled, itemCount, onSelect]);

  return {
    currentIndex: currentIndex.current,
    setCurrentIndex: (index: number) => {
      currentIndex.current = index;
    }
  };
};

// NOTE: Hook for managing modal and expanded state focus
export const useModalFocus = () => {
  const previousFocus = useRef<HTMLElement | null>(null);

  const openModal = (modalElement: HTMLElement) => {
    // Store current focus
    previousFocus.current = document.activeElement as HTMLElement;
    
    // Move focus to modal
    modalElement.focus();
    
    // Trap focus within modal
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
  };

  const closeModal = () => {
    // Return focus to previous element
    if (previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  };

  return {
    openModal,
    closeModal
  };
};

