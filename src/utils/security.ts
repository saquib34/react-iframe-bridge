// src/utils/security.ts
import { SecurityConfig, SecurityError } from '../types';

/**
 * STEP 5: SECURITY UTILITIES
 *
 * These functions handle origin validation and message security
 */

export class SecurityManager {
  private config: SecurityConfig;
  private messageCount: Map<string, number> = new Map();
  private lastReset: number = Date.now();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Validates if an origin is allowed to communicate
   *
   * @param origin - The origin to validate
   * @returns true if origin is allowed, false otherwise
   */
  validateOrigin(origin: string): boolean {
    // Allow any origin if '*' is specified
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    // Check exact matches
    if (this.config.allowedOrigins.includes(origin)) {
      return true;
    }

    // Check wildcard patterns (e.g., *.example.com)
    return this.config.allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.slice(2);
        return origin.endsWith(domain);
      }
      return false;
    });
  }

  /**
   * Validates message size
   *
   * @param message - The message to validate
   * @throws SecurityError if message is too large
   */
  validateMessageSize(message: any): void {
    if (!this.config.maxMessageSize) return;

    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.maxMessageSize) {
      throw new SecurityError(
        `Message size ${messageSize} bytes exceeds maximum allowed size ${this.config.maxMessageSize} bytes`
      );
    }
  }

  /**
   * Implements rate limiting
   *
   * @param origin - The origin sending the message
   * @throws SecurityError if rate limit exceeded
   */
  checkRateLimit(origin: string): void {
    if (!this.config.rateLimitPerSecond) return;

    const now = Date.now();

    // Reset counter every second
    if (now - this.lastReset > 1000) {
      this.messageCount.clear();
      this.lastReset = now;
    }

    const currentCount = this.messageCount.get(origin) || 0;

    if (currentCount >= this.config.rateLimitPerSecond) {
      throw new SecurityError(`Rate limit exceeded for origin ${origin}`);
    }

    this.messageCount.set(origin, currentCount + 1);
  }

  /**
   * Comprehensive security check for incoming messages
   *
   * @param event - The MessageEvent to validate
   * @param message - The parsed message
   * @throws SecurityError if validation fails
   */
  validateIncomingMessage(event: MessageEvent, message: any): void {
    // Validate origin
    if (!this.validateOrigin(event.origin)) {
      throw new SecurityError(
        `Message from unauthorized origin: ${event.origin}`
      );
    }

    // Check rate limiting
    this.checkRateLimit(event.origin);

    // Validate message size
    this.validateMessageSize(message);

    // Validate that the message claims the correct origin
    if (message.origin && message.origin !== event.origin) {
      throw new SecurityError(
        `Message origin mismatch: claimed ${message.origin}, actual ${event.origin}`
      );
    }
  }
}
