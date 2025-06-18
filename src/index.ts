// src/index.ts
/**
 * STEP 12: MAIN EXPORT FILE
 *
 * Exports all public APIs of the library
 */

// Main hooks
export { useParentCommunication } from './hooks/useParentCommunication';
export { useChildCommunication } from './hooks/useChildCommunication';
export { useSharedState } from './hooks/useSharedState';

// React components
export { SecureIframe, type SecureIframeRef } from './components/SecureIframe';
export {
  IframeBridgeProvider,
  useIframeBridgeConfig,
} from './context/IframeBridgeContext';

// Types
export type {
  IframeBridgeConfig,
  SecurityConfig,
  CommunicationConfig,
  ParentCommunicationHook,
  ChildCommunicationHook,
  BaseMessage,
  MessageWithPayload,
  ResponseMessage,
} from './types';

// Error classes
export {
  IframeBridgeError,
  SecurityError,
  TimeoutError,
  ValidationError,
} from './types';

// Utility classes (advanced users)
export { SecurityManager } from './utils/security';
export { MessageManager } from './utils/message-manager';
