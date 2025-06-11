// NOTE: Centralized state management without external dependencies
// Uses React's built-in useReducer for predictable state updates

export interface AppState {
  // Component selection and data
  selectedComponent: any | null;
  components: any[];
  filteredComponents: any[];
  
  // UI state
  loading: boolean;
  error: string | null;
  
  // Search and filters
  searchTerm: string;
  activeView: 'table' | 'sankey' | 'graph' | 'map';
  
  // Layout state
  isExpanded: boolean;
  
  // IP Screener state
  analysisData: any | null;
  analysisLoading: boolean;
  
  // Status messages
  statusMessage: string;
  statusType: 'info' | 'success' | 'warning' | 'error';
  showStatus: boolean;
}

// NOTE: Action types enum for type safety and IDE autocomplete
export enum AppActionType {
  // Component actions
  SELECT_COMPONENT = 'SELECT_COMPONENT',
  SET_COMPONENTS = 'SET_COMPONENTS',
  SET_FILTERED_COMPONENTS = 'SET_FILTERED_COMPONENTS',
  
  // UI actions
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  
  // Search and filter actions
  SET_SEARCH_TERM = 'SET_SEARCH_TERM',
  SET_ACTIVE_VIEW = 'SET_ACTIVE_VIEW',
  
  // Layout actions
  SET_EXPANDED = 'SET_EXPANDED',
  TOGGLE_EXPANDED = 'TOGGLE_EXPANDED',
  
  // IP Screener actions
  SET_ANALYSIS_DATA = 'SET_ANALYSIS_DATA',
  SET_ANALYSIS_LOADING = 'SET_ANALYSIS_LOADING',
  CLEAR_ANALYSIS = 'CLEAR_ANALYSIS',
  
  // Status actions
  SET_STATUS = 'SET_STATUS',
  CLEAR_STATUS = 'CLEAR_STATUS',
  
  // Bulk actions
  RESET_STATE = 'RESET_STATE'
}

export interface AppAction {
  type: AppActionType;
  payload?: any;
}

// NOTE: Initial state with sensible defaults
export const initialAppState: AppState = {
  selectedComponent: null,
  components: [],
  filteredComponents: [],
  loading: false,
  error: null,
  searchTerm: '',
  activeView: 'table',
  isExpanded: false,
  analysisData: null,
  analysisLoading: false,
  statusMessage: '',
  statusType: 'info',
  showStatus: false
};

// NOTE: Reducer function with comprehensive action handling
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case AppActionType.SELECT_COMPONENT:
      return {
        ...state,
        selectedComponent: action.payload,
        // Clear previous analysis when selecting new component
        analysisData: null,
        error: null
      };

    case AppActionType.SET_COMPONENTS:
      return {
        ...state,
        components: action.payload,
        filteredComponents: action.payload,
        loading: false,
        error: null
      };

    case AppActionType.SET_FILTERED_COMPONENTS:
      return {
        ...state,
        filteredComponents: action.payload
      };

    case AppActionType.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        // Clear error when starting new loading
        error: action.payload ? null : state.error
      };

    case AppActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
        statusMessage: action.payload || '',
        statusType: 'error',
        showStatus: !!action.payload
      };

    case AppActionType.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        showStatus: false
      };

    case AppActionType.SET_SEARCH_TERM:
      return {
        ...state,
        searchTerm: action.payload
      };

    case AppActionType.SET_ACTIVE_VIEW:
      return {
        ...state,
        activeView: action.payload
      };

    case AppActionType.SET_EXPANDED:
      return {
        ...state,
        isExpanded: action.payload
      };

    case AppActionType.TOGGLE_EXPANDED:
      return {
        ...state,
        isExpanded: !state.isExpanded
      };

    case AppActionType.SET_ANALYSIS_DATA:
      return {
        ...state,
        analysisData: action.payload,
        analysisLoading: false,
        statusMessage: action.payload ? 
          `Analysis complete: ${action.payload.patentCount || 0} patents found` : '',
        statusType: 'success',
        showStatus: !!action.payload
      };

    case AppActionType.SET_ANALYSIS_LOADING:
      return {
        ...state,
        analysisLoading: action.payload,
        statusMessage: action.payload ? 'Analysing component with IP Screener...' : '',
        statusType: 'info',
        showStatus: action.payload
      };

    case AppActionType.CLEAR_ANALYSIS:
      return {
        ...state,
        analysisData: null,
        analysisLoading: false
      };

    case AppActionType.SET_STATUS:
      return {
        ...state,
        statusMessage: action.payload.message || '',
        statusType: action.payload.type || 'info',
        showStatus: true
      };

    case AppActionType.CLEAR_STATUS:
      return {
        ...state,
        showStatus: false
      };

    case AppActionType.RESET_STATE:
      return {
        ...initialAppState,
        // Preserve components data on reset
        components: state.components,
        filteredComponents: state.components
      };

    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

// NOTE: Action creators for type safety and consistency
export const appActions = {
  selectComponent: (component: any) => ({
    type: AppActionType.SELECT_COMPONENT,
    payload: component
  }),

  setComponents: (components: any[]) => ({
    type: AppActionType.SET_COMPONENTS,
    payload: components
  }),

  setFilteredComponents: (components: any[]) => ({
    type: AppActionType.SET_FILTERED_COMPONENTS,
    payload: components
  }),

  setLoading: (loading: boolean) => ({
    type: AppActionType.SET_LOADING,
    payload: loading
  }),

  setError: (error: string | null) => ({
    type: AppActionType.SET_ERROR,
    payload: error
  }),

  clearError: () => ({
    type: AppActionType.CLEAR_ERROR
  }),

  setSearchTerm: (term: string) => ({
    type: AppActionType.SET_SEARCH_TERM,
    payload: term
  }),

  setActiveView: (view: 'table' | 'sankey' | 'graph' | 'map') => ({
    type: AppActionType.SET_ACTIVE_VIEW,
    payload: view
  }),

  setExpanded: (expanded: boolean) => ({
    type: AppActionType.SET_EXPANDED,
    payload: expanded
  }),

  toggleExpanded: () => ({
    type: AppActionType.TOGGLE_EXPANDED
  }),

  setAnalysisData: (data: any) => ({
    type: AppActionType.SET_ANALYSIS_DATA,
    payload: data
  }),

  setAnalysisLoading: (loading: boolean) => ({
    type: AppActionType.SET_ANALYSIS_LOADING,
    payload: loading
  }),

  clearAnalysis: () => ({
    type: AppActionType.CLEAR_ANALYSIS
  }),

  setStatus: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => ({
    type: AppActionType.SET_STATUS,
    payload: { message, type }
  }),

  clearStatus: () => ({
    type: AppActionType.CLEAR_STATUS
  }),

  resetState: () => ({
    type: AppActionType.RESET_STATE
  })
};

