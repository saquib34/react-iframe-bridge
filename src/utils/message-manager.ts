// src/utils/message-manager.ts
import { v4 as uuidv4 } from 'uuid';
import {
  MessageWithPayload,
  ResponseMessage,
  MessageWithPayloadSchema,
  ResponseMessageSchema,
  ValidationError,
  TimeoutError,
} from '../types';

export class MessageManager {
  private pendingRequests: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  createMessage(
    type: string,
    payload?: unknown,
    origin: string = window.location.origin,
    targetOrigin: string = '*'
  ): MessageWithPayload {
    const message: MessageWithPayload = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      origin,
      targetOrigin,
      payload,
    };

    if (this.debug) {
      console.log('[IframeBridge] Created message:', message);
    }

    return message;
  }

  createResponse(
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: unknown,
    error?: string
  ): ResponseMessage {
    const response: ResponseMessage = {
      id: uuidv4(),
      type: `${originalMessage.type}_RESPONSE`,
      timestamp: Date.now(),
      origin: window.location.origin,
      targetOrigin: originalMessage.origin,
      responseId: originalMessage.id,
      success,
      payload,
      error,
    };

    if (this.debug) {
      console.log('[IframeBridge] Created response:', response);
    }

    return response;
  }

  validateMessage(data: unknown): MessageWithPayload {
    try {
      return MessageWithPayloadSchema.parse(data);
    } catch (error) {
      throw new ValidationError(`Invalid message format: ${error}`);
    }
  }

  validateResponse(data: unknown): ResponseMessage {
    try {
      return ResponseMessageSchema.parse(data);
    } catch (error) {
      throw new ValidationError(`Invalid response format: ${error}`);
    }
  }

  registerPendingRequest<T>(messageId: string, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(
          new TimeoutError(
            `Request ${messageId} timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      this.pendingRequests.set(messageId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      if (this.debug) {
        console.log(`[IframeBridge] Registered pending request: ${messageId}`);
      }
    });
  }

  resolvePendingRequest(response: ResponseMessage): void {
    const pending = this.pendingRequests.get(response.responseId);

    if (!pending) {
      if (this.debug) {
        console.warn(
          `[IframeBridge] No pending request found for response: ${response.responseId}`
        );
      }
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.responseId);

    if (response.success) {
      pending.resolve(response.payload as unknown);
    } else {
      pending.reject(new Error(response.error || 'Request failed'));
    }

    if (this.debug) {
      console.log(
        `[IframeBridge] Resolved pending request: ${response.responseId}`
      );
    }
  }

  cleanup(): void {}
}
