// src/utils/security.ts
import { SecurityConfig, SecurityError } from '../types';

export class SecurityManager {
  private config: SecurityConfig;
  private messageCount: Map<string, number> = new Map();
  private lastReset: number = Date.now();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  validateOrigin(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }
    if (this.config.allowedOrigins.includes(origin)) {
      return true;
    }
    return this.config.allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.slice(2);
        return origin.endsWith(domain);
      }
      return false;
    });
  }

  validateMessageSize(message: unknown): void {
    if (!this.config.maxMessageSize) return;
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.maxMessageSize) {
      throw new SecurityError(
        `Message size ${messageSize} bytes exceeds maximum allowed size ${this.config.maxMessageSize} bytes`
      );
    }
  }

  checkRateLimit(origin: string): void {
    if (!this.config.rateLimitPerSecond) return;
    const now = Date.now();
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

  validateIncomingMessage(event: MessageEvent, message: unknown): void {
    if (!this.validateOrigin(event.origin)) {
      throw new SecurityError(
        `Message from unauthorized origin: ${event.origin}`
      );
    }
    this.checkRateLimit(event.origin);
    this.validateMessageSize(message);
    if (
      typeof message === 'object' &&
      message !== null &&
      'origin' in message &&
      (message as { origin: string }).origin !== event.origin
    ) {
      throw new SecurityError(
        `Message origin mismatch: claimed ${(message as { origin: string }).origin}, actual ${event.origin}`
      );
    }
  }
}
