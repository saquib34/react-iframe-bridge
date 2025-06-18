# 📖 Detailed API Reference

## Core Types

### IframeBridgeConfig

```typescript
interface IframeBridgeConfig {
  allowedOrigins: string[];
  security?: SecurityConfig;
  communication?: CommunicationConfig;
}

interface SecurityConfig {
  maxMessageSize?: number;          // Default: 1048576 (1MB)
  rateLimitMs?: number;             // Default: 100ms
  maxPendingRequests?: number;      // Default: 10
  validatePayload?: (payload: any) => boolean;
  sanitizePayload?: (payload: any) => any;
}

interface CommunicationConfig {
  timeout?: number;                 // Default: 5000ms
  retryAttempts?: number;           // Default: 3
  retryDelay?: number;              // Default: 1000ms
  debug?: boolean;                  // Default: false
  verboseLogging?: boolean;         // Default: false
  onMetrics?: (metrics: PerformanceMetrics) => void;
  onError?: (error: Error) => void;
}
```

### Message Types

```typescript
interface MessageWithPayload {
  id: string;                       // Unique message identifier
  type: string;                     // Message type
  payload: any;                     // Message data
  origin: string;                   // Sender origin
  targetOrigin: string;             // Intended recipient origin
  timestamp: number;                // Unix timestamp
  sequenceNumber?: number;          // Message sequence for ordering
}

interface CommunicationResponse {
  id: string;                       // Original message ID
  success: boolean;                 // Success/failure status
  payload?: any;                    // Response data
  error?: string;                   // Error message if failed
  timestamp: number;                // Response timestamp
}

interface PerformanceMetrics {
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;
  errorRate: number;
  queueSize: number;
  activeConnections: number;
}
```

## Hook APIs

### useParentCommunication

**Full API:**

```typescript
interface ParentCommunicationHook {
  // Send one-way message to child
  sendToChild: <T = any>(
    type: string,
    payload?: T,
    targetOrigin?: string
  ) => Promise<void>;

  // Send request and wait for response
  requestFromChild: <T = any, R = any>(
    type: string,
    payload?: T,
    targetOrigin?: string
  ) => Promise<R>;

  // Listen for messages from child
  onMessage: <T = any>(
    type: string,
    handler: MessageHandler<T>
  ) => UnsubscribeFunction;

  // Respond to child's request
  respondToChild: (
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: any,
    error?: string
  ) => void;

  // Broadcast to all children
  broadcast: <T = any>(
    type: string,
    payload?: T
  ) => Promise<void>;

  // Connection status
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // Error information
  lastError: Error | null;
  errorHistory: Error[];

  // Performance metrics
  metrics: PerformanceMetrics;
}

type MessageHandler<T> = (payload: T, message: MessageWithPayload) => void;
type UnsubscribeFunction = () => void;
```

**Detailed Method Documentation:**

#### sendToChild

```typescript
sendToChild<T = any>(
  type: string,           // Message type identifier
  payload?: T,            // Optional data to send
  targetOrigin?: string   // Target origin (default: first allowed origin)
): Promise<void>
```

**Parameters:**
- `type`: String identifier for the message type
- `payload`: Any serializable data to send
- `targetOrigin`: Specific origin to target (optional)

**Returns:** Promise that resolves when message is sent

**Throws:**
- `Error`: If iframe is not connected
- `SecurityError`: If targetOrigin is not allowed
- `ValidationError`: If payload fails validation

**Example:**
```typescript
// Simple message
await communication.sendToChild('USER_LOGGED_IN');

// Message with data
await communication.sendToChild('UPDATE_PREFERENCES', {
  theme: 'dark',
  language: 'en'
});

// Message to specific origin
await communication.sendToChild('SENSITIVE_DATA', data, 'https://trusted.com');
```

#### requestFromChild

```typescript
requestFromChild<T = any, R = any>(
  type: string,           // Request type
  payload?: T,            // Request data
  targetOrigin?: string   // Target origin
): Promise<R>
```

**Parameters:**
- `type`: Request type identifier
- `payload`: Request data (optional)
- `targetOrigin`: Specific origin to target (optional)

**Returns:** Promise that resolves with response data

**Throws:**
- `TimeoutError`: If request times out
- `Error`: If child responds with error
- `SecurityError`: If origin validation fails

**Example:**
```typescript
// Simple request
const status = await communication.requestFromChild('GET_STATUS');

// Request with parameters
const userData = await communication.requestFromChild('GET_USER_DATA', {
  includePreferences: true,
  fields: ['name', 'email', 'avatar']
});

// Handle errors
try {
  const result = await communication.requestFromChild('RISKY_OPERATION');
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Request timed out');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

#### onMessage

```typescript
onMessage<T = any>(
  type: string,                    // Message type to listen for
  handler: MessageHandler<T>       // Handler function
): UnsubscribeFunction
```

**Parameters:**
- `type`: Message type to subscribe to
- `handler`: Function to call when message is received

**Returns:** Function to unsubscribe from messages

**Example:**
```typescript
// Basic subscription
const unsubscribe = communication.onMessage('PAYMENT_COMPLETE', (payload) => {
  console.log('Payment completed:', payload.transactionId);
});

// With full message details
const unsubscribe = communication.onMessage('FORM_SUBMIT', (payload, message) => {
  console.log('Form data:', payload);
  console.log('Message from:', message.origin);
  console.log('Timestamp:', new Date(message.timestamp));
});

// Multiple subscriptions
const unsubscribePayment = communication.onMessage('PAYMENT_COMPLETE', handlePayment);
const unsubscribeError = communication.onMessage('PAYMENT_ERROR', handleError);

// Cleanup (important!)
useEffect(() => {
  return () => {
    unsubscribePayment();
    unsubscribeError();
  };
}, []);
```

#### respondToChild

```typescript
respondToChild(
  originalMessage: MessageWithPayload,  // Original request message
  success: boolean,                     // Success/failure status
  payload?: any,                        // Response data
  error?: string                        // Error message
): void
```

**Parameters:**
- `originalMessage`: The original request message to respond to
- `success`: Whether the request was successful
- `payload`: Response data (optional)
- `error`: Error message if success is false

**Example:**
```typescript
// Handle request and respond
communication.onMessage('GET_USER_PROFILE', async (requestPayload, message) => {
  try {
    const profile = await fetchUserProfile(requestPayload.userId);
    communication.respondToChild(message, true, profile);
  } catch (error) {
    communication.respondToChild(message, false, null, error.message);
  }
});

// Quick success response
communication.onMessage('PING', (payload, message) => {
  communication.respondToChild(message, true, { pong: Date.now() });
});
```

### useChildCommunication

**Full API:**

```typescript
interface ChildCommunicationHook {
  // Send message to parent
  sendToParent: <T = any>(
    type: string,
    payload?: T
  ) => Promise<void>;

  // Send request to parent and wait for response
  requestFromParent: <T = any, R = any>(
    type: string,
    payload?: T
  ) => Promise<R>;

  // Listen for messages from parent
  onMessage: <T = any>(
    type: string,
    handler: MessageHandler<T>
  ) => UnsubscribeFunction;

  // Respond to parent's request
  respondToParent: (
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: any,
    error?: string
  ) => void;

  // Signal readiness to parent
  signalReady: (metadata?: any) => void;

  // Check if running in iframe
  isInIframe: () => boolean;

  // Connection status
  isConnected: boolean;
  parentOrigin: string | null;

  // Error tracking
  lastError: Error | null;
  errorHistory: Error[];

  // Performance metrics
  metrics: PerformanceMetrics;
}
```

**Detailed Method Documentation:**

#### sendToParent

```typescript
sendToParent<T = any>(
  type: string,     // Message type
  payload?: T       // Message data
): Promise<void>
```

**Example:**
```typescript
// Notify parent of important events
await communication.sendToParent('USER_ACTION', {
  action: 'button_click',
  elementId: 'submit-btn',
  timestamp: Date.now()
});

// Send form data
await communication.sendToParent('FORM_SUBMIT', {
  name: 'John Doe',
  email: 'john@example.com',
  preferences: { newsletter: true }
});
```

#### requestFromParent

```typescript
requestFromParent<T = any, R = any>(
  type: string,     // Request type
  payload?: T       // Request data
): Promise<R>
```

**Example:**
```typescript
// Request user data from parent
const userData = await communication.requestFromParent('GET_USER_DATA');

// Request with parameters
const config = await communication.requestFromParent('GET_CONFIG', {
  section: 'payments',
  includeSecrets: false
});
```

#### signalReady

```typescript
signalReady(metadata?: any): void
```

**Example:**
```typescript
// Basic ready signal
communication.signalReady();

// Ready signal with metadata
communication.signalReady({
  version: '1.2.3',
  capabilities: ['payments', 'analytics'],
  loadTime: performance.now()
});
```

### useSharedState

**Full API:**

```typescript
interface SharedStateHook<T> {
  // Current state value
  value: T;

  // Set new state value
  setValue: (newValue: T | ((prevValue: T) => T)) => void;

  // Loading state during sync
  isLoading: boolean;

  // Last successful sync timestamp
  lastSync: number | null;

  // Sync error if any
  error: Error | null;

  // Force resync from other side
  resync: () => Promise<void>;

  // Reset to default value
  reset: () => void;

  // Validation status
  isValid: boolean;
  validationErrors: string[];

  // Conflict resolution
  hasConflict: boolean;
  resolveConflict: (resolution: 'local' | 'remote' | 'merge') => void;
}

interface UseSharedStateOptions<T> {
  key: string;                              // Unique state key
  defaultValue: T;                          // Default state value
  isParent: boolean;                        // Parent or child mode
  config: IframeBridgeConfig;               // Communication config
  iframeRef?: RefObject<HTMLIFrameElement>; // Required for parent
  
  // Advanced options
  persistLocal?: boolean;                   // Persist to localStorage
  syncMode?: 'immediate' | 'debounced' | 'manual';
  debounceMs?: number;                      // Debounce delay (default: 300ms)
  validator?: (value: T) => boolean | string[];
  conflictResolver?: (local: T, remote: T) => T;
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  };
}
```

**Advanced Features:**

#### Custom Validation

```typescript
const { value, setValue, isValid, validationErrors } = useSharedState({
  key: 'userForm',
  defaultValue: { name: '', email: '', age: 0 },
  isParent: true,
  config: { allowedOrigins: ['*'] },
  iframeRef,
  validator: (data) => {
    const errors = [];
    if (!data.name) errors.push('Name is required');
    if (!data.email.includes('@')) errors.push('Valid email is required');
    if (data.age < 18) errors.push('Must be 18 or older');
    return errors.length === 0 ? true : errors;
  }
});

// Check validation status
if (!isValid) {
  console.log('Validation errors:', validationErrors);
}
```

#### Conflict Resolution

```typescript
const { value, setValue, hasConflict, resolveConflict } = useSharedState({
  key: 'document',
  defaultValue: { content: '', lastModified: 0 },
  isParent: true,
  config: { allowedOrigins: ['*'] },
  iframeRef,
  conflictResolver: (local, remote) => {
    // Merge based on timestamps
    if (local.lastModified > remote.lastModified) {
      return local;
    } else if (remote.lastModified > local.lastModified) {
      return remote;
    } else {
      // Merge content if timestamps are equal
      return {
        content: local.content + '\n---\n' + remote.content,
        lastModified: Math.max(local.lastModified, remote.lastModified)
      };
    }
  }
});

// Handle conflicts
if (hasConflict) {
  // Auto-resolve with custom logic
  resolveConflict('merge');
  
  // Or let user choose
  showConflictDialog({
    onResolve: (choice) => resolveConflict(choice)
  });
}
```

#### Custom Serialization

```typescript
const { value, setValue } = useSharedState({
  key: 'complexData',
  defaultValue: new Map(),
  isParent: true,
  config: { allowedOrigins: ['*'] },
  iframeRef,
  serializer: {
    serialize: (map) => JSON.stringify([...map.entries()]),
    deserialize: (str) => new Map(JSON.parse(str))
  }
});
```

## Component APIs

### SecureIframe

**Full Props Interface:**

```typescript
interface SecureIframeProps extends Omit<IframeHTMLAttributes<HTMLIFrameElement>, 'onError' | 'onLoad'> {
  // Required props
  config: IframeBridgeConfig;
  
  // Event handlers
  onReady?: (metadata?: any) => void;
  onError?: (error: Error) => void;
  onMessage?: (type: string, payload: any, message: MessageWithPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onLoad?: (event: Event) => void;
  
  // Advanced options
  autoSignalReady?: boolean;          // Default: true
  loadingComponent?: React.ReactNode; // Show while loading
  errorComponent?: React.ReactNode;   // Show on error
  retryOnError?: boolean;             // Default: true
  maxRetries?: number;                // Default: 3
  
  // Security options
  strictOriginCheck?: boolean;        // Default: true
  allowPopups?: boolean;              // Default: false
  allowSameOrigin?: boolean;          // Default: true
}

interface SecureIframeRef {
  // Communication hook instance
  communication: ParentCommunicationHook;
  
  // Direct iframe element access
  iframe: HTMLIFrameElement | null;
  
  // Control methods
  reload: () => void;
  updateSrc: (newSrc: string) => void;
  
  // Status
  isLoaded: boolean;
  isReady: boolean;
  loadTime: number | null;
}
```

**Advanced Usage:**

```typescript
function AdvancedIframeUsage() {
  const secureIframeRef = useRef<SecureIframeRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const handleReady = (metadata: any) => {
    console.log('Iframe ready with metadata:', metadata);
    setIsLoading(false);
    
    // Send initial configuration
    secureIframeRef.current?.communication.sendToChild('INIT_CONFIG', {
      theme: 'dark',
      apiKey: process.env.REACT_APP_API_KEY,
      features: ['payments', 'analytics']
    });
  };

  const handleError = (error: Error) => {
    console.error('Iframe error:', error);
    setError(error);
    setIsLoading(false);
  };

  const handleMessage = (type: string, payload: any, message: MessageWithPayload) => {
    console.log(`Received ${type} from ${message.origin}:`, payload);
    
    // Route messages to appropriate handlers
    switch (type) {
      case 'PAYMENT_COMPLETE':
        handlePaymentComplete(payload);
        break;
      case 'ERROR_OCCURRED':
        handleIframeError(payload);
        break;
      case 'ANALYTICS_EVENT':
        trackAnalyticsEvent(payload);
        break;
    }
  };

  const reloadIframe = () => {
    setIsLoading(true);
    setError(null);
    secureIframeRef.current?.reload();
  };

  return (
    <div>
      {isLoading && (
        <div className="loading">
          <span>Loading secure content...</span>
        </div>
      )}
      
      {error && (
        <div className="error">
          <span>Failed to load content: {error.message}</span>
          <button onClick={reloadIframe}>Retry</button>
        </div>
      )}
      
      <SecureIframe
        ref={secureIframeRef}
        src="https://secure.payment-provider.com/widget"
        config={{
          allowedOrigins: [
            'https://secure.payment-provider.com',
            'https://sandbox.payment-provider.com'
          ],
          security: {
            maxMessageSize: 2 * 1024 * 1024, // 2MB
            rateLimitMs: 50,
            validatePayload: (payload) => {
              // Validate payment data structure
              if (payload.type === 'payment') {
                return payload.amount && payload.currency && payload.method;
              }
              return true;
            }
          },
          communication: {
            timeout: 10000,
            retryAttempts: 5,
            debug: process.env.NODE_ENV === 'development'
          }
        }}
        style={{
          width: '100%',
          height: '500px',
          border: '1px solid #e1e5e9',
          borderRadius: '8px'
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        onReady={handleReady}
        onError={handleError}
        onMessage={handleMessage}
        onConnect={() => console.log('Connected to iframe')}
        onDisconnect={() => console.log('Disconnected from iframe')}
        autoSignalReady={true}
        retryOnError={true}
        maxRetries={3}
        strictOriginCheck={true}
      />
    </div>
  );
}
```

## Utility Functions

### Message Manager

```typescript
class MessageManager {
  // Create a new message
  createMessage<T>(
    type: string,
    payload: T,
    origin: string,
    targetOrigin: string
  ): MessageWithPayload;

  // Validate incoming message
  validateMessage(data: any): MessageWithPayload;

  // Register pending request
  registerPendingRequest<R>(
    messageId: string,
    timeout: number
  ): Promise<R>;

  // Resolve pending request
  resolvePendingRequest(response: CommunicationResponse): void;

  // Create response message
  createResponse(
    originalMessage: MessageWithPayload,
    success: boolean,
    payload?: any,
    error?: string
  ): CommunicationResponse;
}
```

### Security Manager

```typescript
class SecurityManager {
  constructor(config: IframeBridgeConfig);

  // Validate incoming message origin
  validateOrigin(origin: string): boolean;

  // Validate message structure
  validateIncomingMessage(event: MessageEvent, data: any): void;

  // Check message size
  validateMessageSize(message: MessageWithPayload): void;

  // Rate limiting check
  checkRateLimit(origin: string): boolean;

  // Sanitize payload
  sanitizePayload(payload: any): any;
}
```

## Error Types

```typescript
// Base error class
class IframeBridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'IframeBridgeError';
  }
}

// Specific error types
class SecurityError extends IframeBridgeError {
  constructor(message: string, origin?: string) {
    super(message, 'SECURITY_ERROR', { origin });
    this.name = 'SecurityError';
  }
}

class TimeoutError extends IframeBridgeError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT_ERROR', { timeout });
    this.name = 'TimeoutError';
  }
}

class ValidationError extends IframeBridgeError {
  constructor(message: string, payload?: any) {
    super(message, 'VALIDATION_ERROR', { payload });
    this.name = 'ValidationError';
  }
}

class ConnectionError extends IframeBridgeError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'ConnectionError';
  }
}
```

## Constants

```typescript
// Default configuration values
export const DEFAULT_CONFIG = {
  TIMEOUT: 5000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
  RATE_LIMIT_MS: 100,
  MAX_PENDING_REQUESTS: 10
} as const;

// Message types
export const MESSAGE_TYPES = {
  IFRAME_READY: 'IFRAME_READY',
  SHARED_STATE_UPDATE: 'SHARED_STATE_UPDATE',
  SHARED_STATE_REQUEST: 'SHARED_STATE_REQUEST',
  PING: 'PING',
  PONG: 'PONG'
} as const;

// Error codes
export const ERROR_CODES = {
  SECURITY_ERROR: 'SECURITY_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR'
} as const;
```

This comprehensive API reference covers all the hooks, components, utilities, and types in your iframe bridge library with detailed examples and explanations! 📚