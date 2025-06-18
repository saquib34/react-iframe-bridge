import { z } from 'zod';

export const BaseMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  timestamp: z.number().positive(),
  origin: z.string().url(),
  targetOrigin: z.string().url().or(z.literal('*')),
});

export const MessageWithPayloadSchema = BaseMessageSchema.extend({
  payload: z.any(),
});

export const ResponseMessageSchema = BaseMessageSchema.extend({
  responseId: z.string().uuid(),
  success: z.boolean(),
  payload: z.any().optional(),
  error: z.string().optional(),
});

export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type MessageWithPayload = z.infer<typeof MessageWithPayloadSchema>;
export type ResponseMessage = z.infer<typeof ResponseMessageSchema>;

export interface SecurityConfig {
  allowedOrigins: string[];
  validatePayload?: boolean;
  maxMessageSize?: number;
  rateLimitPerSecond?: number;
}

export interface CommunicationConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  debug?: boolean;
}

export interface IframeBridgeConfig extends SecurityConfig {
  communication?: CommunicationConfig;
}

export interface ParentCommunicationHook {
  sendToChild: <T = unknown>(
    type: string,
    payload?: T,
    targetOrigin?: string
  ) => Promise<void>;
  requestFromChild: <T = unknown, R = unknown>(
    type: string,
    payload?: T,
    targetOrigin?: string
  ) => Promise<R>;
  onMessage: <T = unknown>(
    type: string,
    handler: (payload: T, message: MessageWithPayload) => void
  ) => () => void;
  isConnected: boolean;
  lastError: Error | null;
  respondToChild: (
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: unknown,
    error?: string
  ) => void;
}

export interface ChildCommunicationHook {
  sendToParent: <T = unknown>(type: string, payload?: T) => Promise<void>;
  requestFromParent: <T = unknown, R = unknown>(
    type: string,
    payload?: T
  ) => Promise<R>;
  onMessage: <T = unknown>(
    type: string,
    handler: (payload: T, message: MessageWithPayload) => void
  ) => () => void;
  isConnected: boolean;
  lastError: Error | null;
  respondToParent: (
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: unknown,
    error?: string
  ) => void;
  signalReady: () => void;
}

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
