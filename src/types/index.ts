// src/types/index.ts
import { z } from 'zod';

/**
 * STEP 1: MESSAGE SCHEMA DEFINITIONS
 *
 * These Zod schemas define the structure of messages that can be sent
 * between parent and child components. Zod provides runtime validation
 * and compile-time type safety.
 */

// Base message schema - every message must have these fields
export const BaseMessageSchema = z.object({
  id: z.string().uuid(), // Unique identifier for request/response matching
  type: z.string().min(1), // Message type (e.g., 'PAYMENT_SUCCESS', 'USER_DATA')
  timestamp: z.number().positive(), // When the message was created
  origin: z.string().url(), // Sender's origin for security validation
  targetOrigin: z.string().url().or(z.literal('*')), // Intended recipient's origin
});

// Message with payload - extends base message with actual data
export const MessageWithPayloadSchema = BaseMessageSchema.extend({
  payload: z.any(), // The actual data being sent (can be any JSON-serializable value)
});

// Response message - for request/response patterns
export const ResponseMessageSchema = BaseMessageSchema.extend({
  responseId: z.string().uuid(), // ID of the original request this responds to
  success: z.boolean(), // Whether the operation was successful
  payload: z.any().optional(), // Response data (optional)
  error: z.string().optional(), // Error message if success is false
});

// Export TypeScript types from Zod schemas
export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type MessageWithPayload = z.infer<typeof MessageWithPayloadSchema>;
export type ResponseMessage = z.infer<typeof ResponseMessageSchema>;

/**
 * STEP 2: CONFIGURATION TYPES
 *
 * These types define how the library should be configured
 */

// Security configuration
export interface SecurityConfig {
  allowedOrigins: string[]; // List of origins that are allowed to communicate
  validatePayload?: boolean; // Whether to validate message payloads
  maxMessageSize?: number; // Maximum size of messages in bytes
  rateLimitPerSecond?: number; // Maximum messages per second
}

// Communication configuration
export interface CommunicationConfig {
  timeout?: number; // How long to wait for responses (milliseconds)
  retryAttempts?: number; // Number of retry attempts for failed messages
  retryDelay?: number; // Delay between retry attempts (milliseconds)
  debug?: boolean; // Enable debug logging
}

// Combined configuration
export interface IframeBridgeConfig extends SecurityConfig {
  communication?: CommunicationConfig;
}

/**
 * STEP 3: HOOK RETURN TYPES
 *
 * These define what our custom hooks return to consumers
 */

// Parent hook return type
export interface ParentCommunicationHook {
  // Send a message to the child iframe
  sendToChild: <T = any>(
    type: string,
    payload?: T,
    targetOrigin?: string
  ) => Promise<void>;

  // Send a message and wait for a response
  requestFromChild: <T = any, R = any>(
    type: string,
    payload?: T,
    targetOrigin?: string
  ) => Promise<R>;

  // Subscribe to messages from child
  onMessage: <T = any>(
    type: string,
    handler: (payload: T, message: MessageWithPayload) => void
  ) => () => void;

  // Connection status
  isConnected: boolean;

  // Last error that occurred
  lastError: Error | null;

  // Send a response to a child's request
  respondToChild: (
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: any,
    error?: string
  ) => void;
}

// Child hook return type
export interface ChildCommunicationHook {
  // Send a message to the parent
  sendToParent: <T = any>(type: string, payload?: T) => Promise<void>;

  // Send a message and wait for a response
  requestFromParent: <T = any, R = any>(
    type: string,
    payload?: T
  ) => Promise<R>;

  // Subscribe to messages from parent
  onMessage: <T = any>(
    type: string,
    handler: (payload: T, message: MessageWithPayload) => void
  ) => () => void;

  // Connection status
  isConnected: boolean;

  // Last error that occurred
  lastError: Error | null;

  // Send a response to a parent's request
  respondToParent: (
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: any,
    error?: string
  ) => void;

  // Signal to parent that child is ready
  signalReady: () => void;
}

/**
 * STEP 4: ERROR TYPES
 *
 * Custom error classes for different types of failures
 */

export class IframeBridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'IframeBridgeError';
  }
}

export class SecurityError extends IframeBridgeError {
  constructor(message: string, originalError?: Error) {
    super(message, 'SECURITY_ERROR', originalError);
    this.name = 'SecurityError';
  }
}

export class TimeoutError extends IframeBridgeError {
  constructor(message: string, originalError?: Error) {
    super(message, 'TIMEOUT_ERROR', originalError);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends IframeBridgeError {
  constructor(message: string, originalError?: Error) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'ValidationError';
  }
}
