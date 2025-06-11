// NOTE: Application constants for consistent behavior across components
// Designers can adjust these values to change UI density and timing

export const UI_CONSTANTS = {
  // NOTE: Virtual scroll row height - single source of truth for table density
  ROW_HEIGHT: 48,
  
  // NOTE: Animation timing for consistent motion design
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },
  
  // NOTE: Loading states timing
  LOADING_DELAY: 400, // Show loading indicator after 400ms to avoid flicker
  
  // NOTE: Debounce timing for search inputs
  SEARCH_DEBOUNCE: 300,
  
  // NOTE: Pagination and virtual scroll settings
  ITEMS_PER_PAGE: 50,
  VIRTUAL_BUFFER: 5, // Extra rows to render outside viewport
  
  // NOTE: Focus management timing
  FOCUS_DELAY: 100, // Delay before moving focus to results
  
  // NOTE: Status message auto-hide timing
  STATUS_AUTO_HIDE: 3000,
  
  // NOTE: API timeout settings
  API_TIMEOUT: 30000,
  
  // NOTE: Keyboard shortcuts
  SHORTCUTS: {
    NEXT_COMPONENT: 'n',
    PREVIOUS_COMPONENT: 'p',
    ESCAPE: 'Escape',
    ENTER: 'Enter',
    SPACE: ' '
  }
} as const;

// NOTE: Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
} as const;

// NOTE: Touch target sizes for mobile accessibility
export const TOUCH_TARGETS = {
  MIN_SIZE: 44, // Minimum 44px for WCAG AA compliance
  COMFORTABLE_SIZE: 48,
  LARGE_SIZE: 56
} as const;

