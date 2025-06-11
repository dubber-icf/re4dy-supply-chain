import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction, appReducer, initialAppState } from './AppReducer';

// NOTE: Context for state and dispatch - separate for optimization
const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<React.Dispatch<AppAction> | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

// NOTE: Provider component that wraps the entire application
export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// NOTE: Custom hooks for accessing state and dispatch
// Throws error if used outside provider for better debugging
export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export function useAppDispatch(): React.Dispatch<AppAction> {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within an AppStateProvider');
  }
  return context;
}

// NOTE: Combined hook for components that need both state and dispatch
export function useAppStateAndDispatch(): [AppState, React.Dispatch<AppAction>] {
  return [useAppState(), useAppDispatch()];
}

