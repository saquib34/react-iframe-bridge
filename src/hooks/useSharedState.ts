// src/hooks/useSharedState.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParentCommunication } from './useParentCommunication';
import { useChildCommunication } from './useChildCommunication';
import { IframeBridgeConfig } from '../types';

/**
 * STEP 11: SHARED STATE HOOK (FIXED)
 *
 * Synchronizes state between parent and child components
 */

interface UseSharedStateOptions<T> {
  key: string;
  defaultValue: T;
  isParent: boolean;
  config: IframeBridgeConfig;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

interface SharedStateHook<T> {
  value: T;
  setValue: (newValue: T | ((prev: T) => T)) => void;
  isLoading: boolean;
  lastSync: number | null;
  error: Error | null;
}

/**
 * Hook that synchronizes state between parent and child iframe
 */
export function useSharedState<T>({
  key,
  defaultValue,
  isParent,
  config,
  iframeRef,
}: UseSharedStateOptions<T>): SharedStateHook<T> {
  const [value, setLocalValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const isInitialized = useRef(false);
  const lastUpdateTime = useRef<number>(0);

  const parentComm =
    isParent && iframeRef ? useParentCommunication(iframeRef, config) : null;
  const childComm = !isParent ? useChildCommunication(config) : null;

  /**
   * Updates local value and syncs with other side
   */
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const timestamp = Date.now();
      lastUpdateTime.current = timestamp;

      const finalValue =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(value)
          : newValue;

      setLocalValue(finalValue);

      const messageType = `SHARED_STATE_UPDATE_${key.toUpperCase()}`;
      const messagePayload = {
        value: finalValue,
        timestamp,
        key,
      };

      if (isParent && parentComm) {
        parentComm.sendToChild(messageType, messagePayload).catch((err) => {
          setError(err);
          console.error(`[SharedState] Failed to sync to child:`, err);
        });
      } else if (!isParent && childComm) {
        childComm.sendToParent(messageType, messagePayload).catch((err) => {
          setError(err);
          console.error(`[SharedState] Failed to sync to parent:`, err);
        });
      }
    },
    [value, parentComm, childComm, isParent, key]
  );

  /**
   * Request initial state from the other side
   */
  const requestInitialState = useCallback(async () => {
    if (isInitialized.current) return;

    setIsLoading(true);

    try {
      const messageType = `SHARED_STATE_REQUEST_${key.toUpperCase()}`;
      let response: { value?: T };

      if (isParent && parentComm) {
        response = await parentComm.requestFromChild(messageType, { key });
      } else if (!isParent && childComm) {
        response = await childComm.requestFromParent(messageType, { key });
      } else {
        response = {};
      }

      if (response && typeof response.value !== 'undefined') {
        setLocalValue(response.value);
        setLastSync(Date.now());
      }

      isInitialized.current = true;
      setError(null);
    } catch (err) {
      console.warn(
        `[SharedState] Could not get initial state for ${key}, using default`
      );
      isInitialized.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [parentComm, childComm, isParent, key]);

  /**
   * Handle incoming state updates
   */
  useEffect(() => {
    const currentComm = isParent ? parentComm : childComm;
    if (!currentComm) return;

    const updateMessageType = `SHARED_STATE_UPDATE_${key.toUpperCase()}`;
    const requestMessageType = `SHARED_STATE_REQUEST_${key.toUpperCase()}`;

    // Handle state updates from other side
    const unsubscribeUpdate = currentComm.onMessage(
      updateMessageType,
      (payload: { value: T; timestamp: number; key: string }) => {
        // Only update if this update is newer than our last update
        if (payload.timestamp > lastUpdateTime.current) {
          setLocalValue(payload.value);
          setLastSync(Date.now());
          lastUpdateTime.current = payload.timestamp;
        }
      }
    );

    // Handle requests for current state
    const unsubscribeRequest = currentComm.onMessage(
      requestMessageType,
      (payload: { key: string }, message) => {
        // Use the correct respond method based on isParent
        if (isParent && parentComm) {
          parentComm.respondToChild(message, true, { value, key });
        } else if (!isParent && childComm) {
          childComm.respondToParent(message, true, { value, key });
        }
      }
    );

    return () => {
      unsubscribeUpdate();
      unsubscribeRequest();
    };
  }, [parentComm, childComm, isParent, key, value]);

  /**
   * Initialize state on mount
   */
  useEffect(() => {
    const currentComm = isParent ? parentComm : childComm;
    if (currentComm?.isConnected) {
      requestInitialState();
    }
  }, [
    parentComm?.isConnected,
    childComm?.isConnected,
    requestInitialState,
    isParent,
  ]);

  return {
    value,
    setValue,
    isLoading,
    lastSync,
    error,
  };
}

// ✅ ALTERNATIVE APPROACH: Create a unified communication interface
// This approach creates a common interface that both hooks can use

interface UnifiedCommunication {
  sendMessage: (type: string, payload?: any) => Promise<void>;
  requestMessage: <R = any>(type: string, payload?: any) => Promise<R>;
  onMessage: <T = any>(
    type: string,
    handler: (payload: T, message: any) => void
  ) => () => void;
  respondToMessage: (
    originalMessage: any,
    success: boolean,
    payload?: any,
    error?: string
  ) => void;
  isConnected: boolean;
  lastError: Error | null;
}

/**
 * ✅ BETTER APPROACH: Unified communication wrapper
 */
function createUnifiedCommunication(
  isParent: boolean,
  parentComm: ReturnType<typeof useParentCommunication> | null,
  childComm: ReturnType<typeof useChildCommunication> | null
): UnifiedCommunication | null {
  if (isParent && parentComm) {
    return {
      sendMessage: parentComm.sendToChild,
      requestMessage: parentComm.requestFromChild,
      onMessage: parentComm.onMessage,
      respondToMessage: parentComm.respondToChild,
      isConnected: parentComm.isConnected,
      lastError: parentComm.lastError,
    };
  } else if (!isParent && childComm) {
    return {
      sendMessage: childComm.sendToParent,
      requestMessage: childComm.requestFromParent,
      onMessage: childComm.onMessage,
      respondToMessage: childComm.respondToParent,
      isConnected: childComm.isConnected,
      lastError: childComm.lastError,
    };
  }
  return null;
}

/**
 * ✅ CLEANER VERSION: Using unified communication interface
 */
export function useSharedStateV2<T>({
  key,
  defaultValue,
  isParent,
  config,
  iframeRef,
}: UseSharedStateOptions<T>): SharedStateHook<T> {
  const [value, setLocalValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const isInitialized = useRef(false);
  const lastUpdateTime = useRef<number>(0);

  // Get communication hooks
  const parentComm =
    isParent && iframeRef ? useParentCommunication(iframeRef, config) : null;
  const childComm = !isParent ? useChildCommunication(config) : null;

  // Create unified communication interface
  const communication = createUnifiedCommunication(
    isParent,
    parentComm,
    childComm
  );

  /**
   * Updates local value and syncs with other side
   */
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const timestamp = Date.now();
      lastUpdateTime.current = timestamp;

      const finalValue =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(value)
          : newValue;

      setLocalValue(finalValue);

      if (communication) {
        const messageType = `SHARED_STATE_UPDATE_${key.toUpperCase()}`;
        communication
          .sendMessage(messageType, {
            value: finalValue,
            timestamp,
            key,
          })
          .catch((err) => {
            setError(err);
            console.error(`[SharedState] Failed to sync:`, err);
          });
      }
    },
    [value, communication, key]
  );

  /**
   * Request initial state from the other side
   */
  const requestInitialState = useCallback(async () => {
    if (!communication || isInitialized.current) return;

    setIsLoading(true);

    try {
      const messageType = `SHARED_STATE_REQUEST_${key.toUpperCase()}`;
      const response = await communication.requestMessage(messageType, { key });

      if (response && typeof response.value !== 'undefined') {
        setLocalValue(response.value);
        setLastSync(Date.now());
      }

      isInitialized.current = true;
      setError(null);
    } catch (err) {
      console.warn(
        `[SharedState] Could not get initial state for ${key}, using default`
      );
      isInitialized.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [communication, key]);

  /**
   * Handle incoming state updates
   */
  useEffect(() => {
    if (!communication) return;

    const updateMessageType = `SHARED_STATE_UPDATE_${key.toUpperCase()}`;
    const requestMessageType = `SHARED_STATE_REQUEST_${key.toUpperCase()}`;

    // Handle state updates from other side
    const unsubscribeUpdate = communication.onMessage(
      updateMessageType,
      (payload: { value: T; timestamp: number; key: string }) => {
        if (payload.timestamp > lastUpdateTime.current) {
          setLocalValue(payload.value);
          setLastSync(Date.now());
          lastUpdateTime.current = payload.timestamp;
        }
      }
    );

    // Handle requests for current state
    const unsubscribeRequest = communication.onMessage(
      requestMessageType,
      (payload: { key: string }, message) => {
        communication.respondToMessage(message, true, { value, key });
      }
    );

    return () => {
      unsubscribeUpdate();
      unsubscribeRequest();
    };
  }, [communication, key, value]);

  /**
   * Initialize state on mount
   */
  useEffect(() => {
    if (communication?.isConnected) {
      requestInitialState();
    }
  }, [communication?.isConnected, requestInitialState]);

  return {
    value,
    setValue,
    isLoading,
    lastSync,
    error,
  };
}
