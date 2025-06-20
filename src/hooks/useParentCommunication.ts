// src/hooks/useParentCommunication.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  ParentCommunicationHook,
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

// ✅ FIX: Accept both ref types to be more flexible
export function useParentCommunication(
  iframeRef: React.RefObject<HTMLIFrameElement | null> | React.RefObject<HTMLIFrameElement>,
  config: IframeBridgeConfig
): ParentCommunicationHook {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const securityManager = useRef(new SecurityManager(config));
  const messageManager = useRef(
    new MessageManager(config.communication?.debug)
  );
  const eventListeners = useRef(new Map<string, Set<MessageHandler>>());
  const commConfig = { ...DEFAULT_CONFIG, ...config.communication };

  /**
   * Sends a message to the child iframe
   */
  const sendToChild = useCallback(
    async <T = unknown>(
      type: string,
      payload?: T,
      targetOrigin: string = '*'
    ): Promise<void> => {
      try {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) {
          throw new Error('Iframe not available or not loaded');
        }

        const message = messageManager.current.createMessage(
          type,
          payload,
          window.location.origin,
          targetOrigin
        );

        // Validate message size
        securityManager.current.validateMessageSize(message);

        iframe.contentWindow.postMessage(message, targetOrigin);

        if (commConfig.debug) {
          console.log('[IframeBridge Parent] Sent message:', message);
        }

        setLastError(null);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setLastError(err);
        throw err;
      }
    },
    [iframeRef, commConfig.debug]
  );

  /**
   * Sends a request to child and waits for response
   */
  const requestFromChild = useCallback(
    async <T = unknown, R = unknown>(
      type: string,
      payload?: T,
      targetOrigin: string = '*'
    ): Promise<R> => {
      try {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) {
          throw new Error('Iframe not available or not loaded');
        }

        const message = messageManager.current.createMessage(
          type,
          payload,
          window.location.origin,
          targetOrigin
        );

        // Register pending request
        const responsePromise =
          messageManager.current.registerPendingRequest<R>(
            message.id,
            commConfig.timeout
          );

        // Send message
        iframe.contentWindow.postMessage(message, targetOrigin);

        if (commConfig.debug) {
          console.log('[IframeBridge Parent] Sent request:', message);
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
    [iframeRef, commConfig.timeout, commConfig.debug]
  );

  /**
   * Subscribe to messages from child
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
        console.log(`[IframeBridge Parent] Registered listener for: ${type}`);
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
   * Send response to child's request
   */
  const respondToChild = useCallback(
    (
      originalMessage: MessageWithPayload,
      success: boolean,
      payload?: unknown,
      error?: string
    ) => {
      try {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) {
          throw new Error('Iframe not available or not loaded');
        }

        const response = messageManager.current.createResponse(
          originalMessage,
          success,
          payload,
          error
        );

        iframe.contentWindow.postMessage(response, originalMessage.origin);

        if (commConfig.debug) {
          console.log('[IframeBridge Parent] Sent response:', response);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setLastError(error);
        console.error('[IframeBridge Parent] Failed to send response:', error);
      }
    },
    [iframeRef, commConfig.debug]
  );

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
          console.log('[IframeBridge Parent] Received message:', message);
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
                '[IframeBridge Parent] Error in message handler:',
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
          console.error('[IframeBridge Parent] Message handling error:', err);
        }
      }
    },
    [commConfig.debug]
  );

  /**
   * Setup and cleanup effects
   */
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    const localListeners = eventListeners.current;
    const checkConnection = () => {
      const iframe = iframeRef.current;
      setIsConnected(!!iframe?.contentWindow);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 1000);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
      localListeners.clear();
    };
  }, [handleMessage, iframeRef]);

  return {
    sendToChild,
    requestFromChild,
    onMessage,
    respondToChild,
    isConnected,
    lastError,
  };
}
