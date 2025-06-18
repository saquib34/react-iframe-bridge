// src/context/IframeBridgeContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { IframeBridgeConfig } from '../types';

/**
 * STEP 9: REACT CONTEXT FOR CONFIGURATION
 *
 * Provides configuration to all child components without prop drilling
 */

interface IframeBridgeContextValue {
  config: IframeBridgeConfig;
}

const IframeBridgeContext = createContext<IframeBridgeContextValue | null>(
  null
);

interface IframeBridgeProviderProps {
  children: ReactNode;
  config: IframeBridgeConfig;
}

/**
 * Provider component that makes configuration available to all child components
 */
export function IframeBridgeProvider({
  children,
  config,
}: IframeBridgeProviderProps) {
  return (
    <IframeBridgeContext.Provider value={{ config }}>
      {children}
    </IframeBridgeContext.Provider>
  );
}

/**
 * Hook to access the iframe bridge configuration
 */
export function useIframeBridgeConfig(): IframeBridgeConfig {
  const context = useContext(IframeBridgeContext);

  if (!context) {
    throw new Error(
      'useIframeBridgeConfig must be used within an IframeBridgeProvider'
    );
  }

  return context.config;
}
