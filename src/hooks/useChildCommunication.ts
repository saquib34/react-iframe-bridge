// src/hooks/useChildCommunication.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  ChildCommunicationHook,
  IframeBridgeConfig,
  MessageWithPayload,
  CommunicationConfig,
} from '../types';
import { SecurityManager } from '../utils/security';
import { MessageManager } from '../utils/message-manager';

const DEFAULT_CONFIG: Required<CommunicationConfig> = {
  timeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
  debug: false,
};

type MessageHandler = (payload: unknown, message: MessageWithPayload) => void;

export function useChildCommunication(
  config: IframeBridgeConfig
): ChildCommunicationHook {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const securityManager = useRef(new SecurityManager(config));
  const messageManager = useRef(
    new MessageManager(config.communication?.debug)
  );
  const eventListeners = useRef(new Map<string, Set<MessageHandler>>());
  const commConfig = { ...DEFAULT_CONFIG, ...config.communication };

  /**
   * Check if we're running in an iframe
   */
  const isInIframe = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true; // If we can't access window.top, we're probably in an iframe
    }
  }, []);

  /**
   * Sends a message to the parent window
   */
  const sendToParent = useCallback(
    async <T = unknown>(type: string, payload?: T): Promise<void> => {
      try {
        if (!isInIframe()) {
          throw new Error('Not running in an iframe');
        }

        const message = messageManager.current.createMessage(
          type,
          payload,
          window.location.origin,
          '*' // Parent origin is typically unknown to child
        );

        // Validate message size
        securityManager.current.validateMessageSize(message);

        window.parent.postMessage(message, '*');

        if (commConfig.debug) {
          console.log('[IframeBridge Child] Sent message:', message);
        }

        setLastError(null);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setLastError(err);
        throw err;
      }
    },
    [isInIframe, commConfig.debug]
  );

  /**
   * Sends a request to parent and waits for response
   */
  const requestFromParent = useCallback(
    async <T = unknown, R = unknown>(type: string, payload?: T): Promise<R> => {
      try {
        if (!isInIframe()) {
          throw new Error('Not running in an iframe');
        }

        const message = messageManager.current.createMessage(
          type,
          payload,
          window.location.origin,
          '*'
        );

        // Register pending request
        const responsePromise =
          messageManager.current.registerPendingRequest<R>(
            message.id,
            commConfig.timeout
          );

        // Send message
        window.parent.postMessage(message, '*');

        if (commConfig.debug) {
          console.log('[IframeBridge Child] Sent request:', message);
        }

        const response = await responsePromise;
        setLastError(null);
        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setLastError(err);
        throw err;
      }
    },
    [isInIframe, commConfig.timeout, commConfig.debug]
  );

  /**
   * Subscribe to messages from parent
   */
  const onMessage = useCallback(
    <T = unknown>(
      type: string,
      handler: (payload: T, message: MessageWithPayload) => void
    ): (() => void) => {
      const typedHandler: MessageHandler = handler as MessageHandler;
      if (!eventListeners.current.has(type)) {
        eventListeners.current.set(type, new Set());
      }

      eventListeners.current.get(type)!.add(typedHandler);

      if (commConfig.debug) {
        console.log(`[IframeBridge Child] Registered listener for: ${type}`);
      }

      // Return unsubscribe function
      return () => {
        const listeners = eventListeners.current.get(type);
        if (listeners) {
          listeners.delete(typedHandler);
          if (listeners.size === 0) {
            eventListeners.current.delete(type);
          }
        }
      };
    },
    [commConfig.debug]
  );

  /**
   * Send response to parent's request
   */
  const respondToParent = useCallback(
    (
      originalMessage: MessageWithPayload,
      success: boolean,
      payload?: unknown,
      error?: string
    ) => {
      try {
        if (!isInIframe()) {
          throw new Error('Not running in an iframe');
        }

        const response = messageManager.current.createResponse(
          originalMessage,
          success,
          payload,
          error
        );

        window.parent.postMessage(response, '*');

        if (commConfig.debug) {
          console.log('[IframeBridge Child] Sent response:', response);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setLastError(error);
        console.error('[IframeBridge Child] Failed to send response:', error);
      }
    },
    [isInIframe, commConfig.debug]
  );

  /**
   * Signal to parent that child is ready for communication
   */
  const signalReady = useCallback(() => {
    sendToParent('IFRAME_READY', {
      origin: window.location.origin,
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('[IframeBridge Child] Failed to signal ready:', error);
    });
  }, [sendToParent]);

  /**
   * Message event handler
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        // Security validation
        securityManager.current.validateIncomingMessage(event, event.data);

        // Validate message format
        const message = messageManager.current.validateMessage(event.data);

        if (commConfig.debug) {
          console.log('[IframeBridge Child] Received message:', message);
        }

        // Handle responses to our requests
        if (message.type.endsWith('_RESPONSE')) {
          const response = messageManager.current.validateResponse(event.data);
          messageManager.current.resolvePendingRequest(response);
          return;
        }

        // Handle regular messages
        const listeners = eventListeners.current.get(message.type);
        if (listeners && listeners.size > 0) {
          listeners.forEach((handler) => {
            try {
              handler(message.payload, message);
            } catch (error) {
              console.error(
                '[IframeBridge Child] Error in message handler:',
                error
              );
            }
          });
        }

        setLastError(null);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setLastError(err);

        if (commConfig.debug) {
          console.error('[IframeBridge Child] Message handling error:', err);
        }
      }
    },
    [commConfig.debug]
  );

  /**
   * Setup and cleanup effects
   */
  useEffect(() => {
    // Add message listener
    window.addEventListener('message', handleMessage);
    const localListeners = eventListeners.current;

    // Check connection status
    const checkConnection = () => {
      setIsConnected(isInIframe());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    // Auto-signal ready when component mounts
    if (isInIframe()) {
      // Delay to ensure parent is ready to receive
      setTimeout(signalReady, 100);
    }

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
      localListeners.clear();
    };
  }, [handleMessage, isInIframe, signalReady]);

  return {
    sendToParent,
    requestFromParent,
    onMessage,
    respondToParent,
    signalReady,
    isConnected,
    lastError,
  };
}
