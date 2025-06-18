// src/utils/message-manager.ts
import { v4 as uuidv4 } from 'uuid';
import {
  BaseMessage,
  MessageWithPayload,
  ResponseMessage,
  MessageWithPayloadSchema,
  ResponseMessageSchema,
  ValidationError,
  TimeoutError,
} from '../types';

/**
 * STEP 6: MESSAGE MANAGEMENT
 *
 * Handles message creation, validation, and request/response patterns
 */

export class MessageManager {
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  /**
   * Creates a new message with required fields
   *
   * @param type - Message type
   * @param payload - Message payload (optional)
   * @param origin - Sender's origin
   * @param targetOrigin - Target origin
   * @returns Formatted message
   */
  createMessage(
    type: string,
    payload?: any,
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

  /**
   * Creates a response message
   *
   * @param originalMessage - The message being responded to
   * @param success - Whether the operation was successful
   * @param payload - Response payload (optional)
   * @param error - Error message if unsuccessful
   * @returns Formatted response message
   */
  createResponse(
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: any,
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

  /**
   * Validates an incoming message against schema
   *
   * @param data - Raw message data
   * @returns Validated message
   * @throws ValidationError if validation fails
   */
  validateMessage(data: any): MessageWithPayload {
    try {
      return MessageWithPayloadSchema.parse(data);
    } catch (error) {
      throw new ValidationError(`Invalid message format: ${error}`);
    }
  }

  /**
   * Validates an incoming response message
   *
   * @param data - Raw response data
   * @returns Validated response
   * @throws ValidationError if validation fails
   */
  validateResponse(data: any): ResponseMessage {
    try {
      return ResponseMessageSchema.parse(data);
    } catch (error) {
      throw new ValidationError(`Invalid response format: ${error}`);
    }
  }

  /**
   * Registers a pending request and returns a promise
   *
   * @param messageId - ID of the message
   * @param timeoutMs - Timeout in milliseconds
   * @returns Promise that resolves with the response
   */
  registerPendingRequest<T>(messageId: string, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(
          new TimeoutError(
            `Request ${messageId} timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeout,
      });

      if (this.debug) {
        console.log(`[IframeBridge] Registered pending request: ${messageId}`);
      }
    });
  }

  /**
   * Resolves a pending request
   *
   * @param response - The response message
   */
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
      pending.resolve(response.payload);
    } else {
      pending.reject(new Error(response.error || 'Request failed'));
    }

    if (this.debug) {
      console.log(
        `[IframeBridge] Resolved pending request: ${response.responseId}`
      );
    }
  }

  /**
   * Cleans up expired requests
   */
  cleanup(): void {
    // This would typically be called periodically to clean up any hanging requests
    // For now, we rely on individual timeouts
  }
}
