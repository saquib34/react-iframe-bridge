import * as React from 'react';
import { useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { useParentCommunication } from '../hooks/useParentCommunication';
import { IframeBridgeConfig, ParentCommunicationHook } from '../types';

interface SecureIframeProps
  extends Omit<React.IframeHTMLAttributes<HTMLIFrameElement>, 'onError'> {
  config: IframeBridgeConfig;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (type: string, payload: any) => void;
}

export interface SecureIframeRef {
  communication: ParentCommunicationHook;
  iframe: HTMLIFrameElement | null;
}

export const SecureIframe = forwardRef<SecureIframeRef, SecureIframeProps>(
  ({ config, onReady, onError, style, ...iframeProps }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const memoizedConfig = useMemo(() => config, [
      config.allowedOrigins,
      config.communication?.debug,
      config.communication?.timeout,
      config.communication?.retryAttempts,
      config.communication?.retryDelay
    ]);
    const communication = useParentCommunication(iframeRef, memoizedConfig);
    useImperativeHandle(
      ref,
      () => ({
        communication,
        iframe: iframeRef.current,
      }),
      [communication]
    );
    const handleReady = useCallback((payload: any) => {
      if (memoizedConfig.communication?.debug) {
        console.log('[SecureIframe] Child iframe is ready:', payload);
      }
      onReady?.();
    }, [memoizedConfig.communication?.debug, onReady]);
    const handleError = useCallback(() => {
      if (communication.lastError) {
        onError?.(communication.lastError);
      }
    }, [communication.lastError, onError]);
    useEffect(() => {
      const unsubscribe = communication.onMessage('IFRAME_READY', handleReady);
      return unsubscribe;
    }, [communication, handleReady]);
    useEffect(() => {
      handleError();
    }, [handleError]);
    return (
      <iframe
        ref={iframeRef}
        style={{
          border: 'none',
          width: '100%',
          height: '400px',
          ...style,
        }}
        sandbox="allow-scripts allow-same-origin allow-forms"
        {...iframeProps}
      />
    );
  }
);

SecureIframe.displayName = 'SecureIframe';

interface SecureIframePropsWithNativeError
  extends Omit<React.IframeHTMLAttributes<HTMLIFrameElement>, 'onError'> {
  config: IframeBridgeConfig;
  onReady?: () => void;
  onCommunicationError?: (error: Error) => void;
  onMessage?: (type: string, payload: any) => void;
  onError?: React.ReactEventHandler<HTMLIFrameElement>;
}

export const SecureIframeV2 = forwardRef<
  SecureIframeRef,
  SecureIframePropsWithNativeError
>(
  (
    { config, onReady, onCommunicationError, onError, style, ...iframeProps },
    ref
  ) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const memoizedConfig = useMemo(() => config, [
      config.allowedOrigins,
      config.communication?.debug,
      config.communication?.timeout,
      config.communication?.retryAttempts,
      config.communication?.retryDelay
    ]);
    const communication = useParentCommunication(iframeRef, memoizedConfig);
    useImperativeHandle(
      ref,
      () => ({
        communication,
        iframe: iframeRef.current,
      }),
      [communication]
    );
    const handleReady = useCallback((payload: any) => {
      if (memoizedConfig.communication?.debug) {
        console.log('[SecureIframe] Child iframe is ready:', payload);
      }
      onReady?.();
    }, [memoizedConfig.communication?.debug, onReady]);
    const handleCommunicationError = useCallback(() => {
      if (communication.lastError) {
        onCommunicationError?.(communication.lastError);
      }
    }, [communication.lastError, onCommunicationError]);
    useEffect(() => {
      const unsubscribe = communication.onMessage('IFRAME_READY', handleReady);
      return unsubscribe;
    }, [communication, handleReady]);
    useEffect(() => {
      handleCommunicationError();
    }, [handleCommunicationError]);
    return (
      <iframe
        ref={iframeRef}
        style={{
          border: 'none',
          width: '100%',
          height: '400px',
          ...style,
        }}
        sandbox="allow-scripts allow-same-origin allow-forms"
        onError={onError}
        {...iframeProps}
      />
    );
  }
);

SecureIframeV2.displayName = 'SecureIframeV2';