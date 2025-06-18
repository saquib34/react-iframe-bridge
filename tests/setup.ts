// Jest setup file
import '@testing-library/jest-dom';

// Mock window.postMessage for testing
Object.defineProperty(window, 'postMessage', {
  value: jest.fn(),
  writable: true
});

// Mock MessageEvent
global.MessageEvent = class MessageEvent extends Event {
  constructor(type: string, eventInitDict?: MessageEventInit) {
    super(type, eventInitDict);
    this.data = eventInitDict?.data;
    this.origin = eventInitDict?.origin || 'http://localhost';
    this.source = eventInitDict?.source ?? null;
  }
  
  data: any;
  origin: string;
  source: MessageEventSource | null = null;
} as any;
