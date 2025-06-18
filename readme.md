# React Iframe Bridge

[![npm version](https://badge.fury.io/js/react-iframes-bridge.svg)](https://badge.fury.io/js/react-iframes-bridge)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/react-iframes-bridge.svg)](https://www.npmjs.com/package/react-iframes-bridge)

A comprehensive TypeScript library for secure, bidirectional communication between React parent applications and iframe content using the postMessage API.

## 🚀 Features

- **🔐 Secure Communication**: Origin validation, rate limiting, and message size controls
- **🎯 Type-Safe**: Full TypeScript support with strict typing
- **🪝 Modern Hooks API**: Clean, React hooks-based architecture
- **🔄 Bidirectional**: Parent ↔ Child communication patterns
- **⚡ Request/Response**: Built-in request-response message patterns
- **🛡️ Error Handling**: Comprehensive error handling with custom error types
- **🎛️ Configurable**: Extensive configuration options for production use
- **📱 Cross-Origin**: Secure cross-origin iframe communication
- **🧪 Well Tested**: Comprehensive test suite included

## 📦 Installation

```bash
npm install react-iframes-bridge
# or
yarn add react-iframes-bridge
# or
pnpm add react-iframes-bridge
```

## 🏗️ Quick Start

### Basic Setup: Two Applications

For production-grade iframe communication, we recommend separating your main application and iframe content into two distinct React applications.

#### Application 1: Parent (Main App)

```tsx
import React, { useRef, useEffect, useState } from 'react';
import { useParentCommunication } from 'react-iframes-bridge';

function ParentApp() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [cart, setCart] = useState([]);

  // Initialize parent communication
  const parentComm = useParentCommunication(iframeRef, {
    allowedOrigins: ['https://checkout.myapp.com'],
    communication: { debug: true }
  });

  // Send cart data to iframe
  const openCheckout = () => {
    parentComm.sendToChild('CART_UPDATE', {
      items: cart,
      total: 199.99
    });
  };

  // Listen for payment results
  useEffect(() => {
    const unsubscribe = parentComm.onMessage('PAYMENT_SUCCESS', (result) => {
      console.log('Payment successful!', result.transactionId);
      setCart([]); // Clear cart
    });

    return unsubscribe;
  }, [parentComm]);

  return (
    <div>
      <h1>My Store</h1>
      <button onClick={openCheckout}>Proceed to Checkout</button>
      
      <iframe
        ref={iframeRef}
        src="https://checkout.myapp.com"
        width="100%"
        height="600px"
      />
    </div>
  );
}
```

#### Application 2: Child (Iframe Content)

```tsx
import React, { useEffect, useState } from 'react';
import { useChildCommunication } from 'react-iframes-bridge';

function CheckoutApp() {
  const [cartData, setCartData] = useState(null);

  // Initialize child communication
  const childComm = useChildCommunication({
    allowedOrigins: ['https://myapp.com'],
    communication: { debug: true }
  });

  // Listen for cart updates from parent
  useEffect(() => {
    const unsubscribe = childComm.onMessage('CART_UPDATE', (data) => {
      setCartData(data);
    });

    return unsubscribe;
  }, [childComm]);

  // Signal ready and handle payment
  useEffect(() => {
    childComm.signalReady();
  }, [childComm]);

  const handlePayment = async () => {
    try {
      // Process payment...
      await childComm.sendToParent('PAYMENT_SUCCESS', {
        transactionId: 'TXN_123456',
        amount: cartData.total
      });
    } catch (error) {
      await childComm.sendToParent('PAYMENT_ERROR', {
        error: error.message
      });
    }
  };

  return (
    <div>
      <h2>Secure Checkout</h2>
      {cartData && (
        <>
          <p>Total: ${cartData.total}</p>
          <button onClick={handlePayment}>Pay Now</button>
        </>
      )}
    </div>
  );
}
```

## 📖 API Documentation

### Core Hooks

#### `useParentCommunication(iframeRef, config)`

Hook for parent applications to communicate with iframe content.

**Parameters:**
- `iframeRef`: React ref to the iframe element
- `config`: Configuration object (see [Configuration](#configuration))

**Returns:** `ParentCommunicationHook`

```tsx
interface ParentCommunicationHook {
  sendToChild: (type: string, payload?: any) => Promise<void>;
  requestFromChild: (type: string, payload?: any) => Promise<any>;
  onMessage: (type: string, handler: MessageHandler) => UnsubscribeFn;
  isConnected: boolean;
  lastError: Error | null;
}
```

#### `useChildCommunication(config)`

Hook for iframe applications to communicate with parent window.

**Parameters:**
- `config`: Configuration object (see [Configuration](#configuration))

**Returns:** `ChildCommunicationHook`

```tsx
interface ChildCommunicationHook {
  sendToParent: (type: string, payload?: any) => Promise<void>;
  requestFromParent: (type: string, payload?: any) => Promise<any>;
  respondToParent: (originalMessage: BaseMessage, success: boolean, data?: any, error?: string) => Promise<void>;
  onMessage: (type: string, handler: MessageHandler) => UnsubscribeFn;
  signalReady: () => void;
  isConnected: boolean;
  lastError: Error | null;
}
```

#### `useSharedState(initialState, config)`

Hook for sharing state between parent and child applications.

```tsx
const [sharedCart, setSharedCart] = useSharedState([], {
  key: 'shopping-cart',
  syncInterval: 1000
});
```

### Components

#### `<SecureIframe />`

Enhanced iframe component with built-in security features.

```tsx
import { SecureIframe } from 'react-iframes-bridge';

<SecureIframe
  src="https://checkout.myapp.com"
  allowedOrigins={['https://checkout.myapp.com']}
  onMessage={(type, payload) => console.log(type, payload)}
  onReady={() => console.log('Iframe ready')}
  onError={(error) => console.error('Iframe error:', error)}
  sandbox="allow-scripts allow-same-origin"
  width="100%"
  height="600px"
/>
```

#### `<IframeBridgeProvider />`

Context provider for global iframe bridge configuration.

```tsx
import { IframeBridgeProvider } from 'react-iframes-bridge';

const config = {
  allowedOrigins: ['https://trusted-domain.com'],
  communication: { timeout: 10000 },
  maxMessageSize: 1024 * 1024
};

function App() {
  return (
    <IframeBridgeProvider config={config}>
      <YourApp />
    </IframeBridgeProvider>
  );
}
```

## ⚙️ Configuration

### `IframeBridgeConfig`

```tsx
interface IframeBridgeConfig {
  // Security settings
  allowedOrigins: string[];              // Allowed iframe origins
  validatePayload?: boolean;             // Validate message payloads
  maxMessageSize?: number;               // Maximum message size in bytes
  rateLimitPerSecond?: number;           // Rate limit for messages

  // Communication settings
  communication?: {
    timeout?: number;                    // Message timeout (ms)
    retryAttempts?: number;              // Number of retry attempts
    retryDelay?: number;                 // Delay between retries (ms)
    debug?: boolean;                     // Enable debug logging
  };

  // Advanced settings
  enableHeartbeat?: boolean;             // Enable connection heartbeat
  heartbeatInterval?: number;            // Heartbeat interval (ms)
  enableCompression?: boolean;           // Enable message compression
}
```

### Security Configuration Examples

#### Basic Security
```tsx
const basicConfig = {
  allowedOrigins: ['https://myapp.com'],
  communication: { debug: false }
};
```

#### Production Security
```tsx
const productionConfig = {
  allowedOrigins: [
    'https://myapp.com',
    'https://www.myapp.com',
    'https://*.myapp.com'
  ],
  validatePayload: true,
  maxMessageSize: 1024 * 1024, // 1MB
  rateLimitPerSecond: 50,
  communication: {
    timeout: 5000,
    retryAttempts: 2,
    retryDelay: 1000,
    debug: false
  },
  enableHeartbeat: true,
  heartbeatInterval: 30000
};
```

#### Development Security
```tsx
const devConfig = {
  allowedOrigins: ['*'], // Allow all origins in development
  communication: { 
    debug: true,
    timeout: 30000 // Longer timeout for debugging
  }
};
```

## 🔄 Communication Patterns

### Fire-and-Forget Messages

```tsx
// Parent sends message to child
await parentComm.sendToChild('USER_LOGIN', {
  userId: '123',
  username: 'john_doe'
});

// Child listens for message
childComm.onMessage('USER_LOGIN', (data) => {
  console.log('User logged in:', data.username);
});
```

### Request-Response Pattern

```tsx
// Parent requests data from child
const userData = await parentComm.requestFromChild('GET_USER_DATA', {
  fields: ['name', 'email']
});

// Child responds to parent's request
childComm.onMessage('GET_USER_DATA', async (payload, originalMessage) => {
  try {
    const userData = await fetchUserData(payload.fields);
    childComm.respondToParent(originalMessage, true, userData);
  } catch (error) {
    childComm.respondToParent(originalMessage, false, null, error.message);
  }
});
```

### State Synchronization

```tsx
// Parent app
const [cartItems, setCartItems] = useSharedState([], {
  key: 'cart-items',
  syncTo: 'child'
});

// Child app
const [cartItems, setCartItems] = useSharedState([], {
  key: 'cart-items',
  syncFrom: 'parent'
});

// Both apps will stay in sync
```

## 🎯 Advanced Usage

### Custom Message Types

```tsx
// Define your message types
interface CustomMessages {
  CART_UPDATE: { items: CartItem[]; total: number };
  PAYMENT_SUCCESS: { transactionId: string; amount: number };
  USER_LOGIN: { userId: string; username: string };
}

// Type-safe message handling
const parentComm = useParentCommunication<CustomMessages>(iframeRef, config);

parentComm.sendToChild('CART_UPDATE', {
  items: cartItems,
  total: calculateTotal(cartItems)
});
```

### Error Handling

```tsx
import { 
  SecurityError, 
  TimeoutError, 
  ValidationError 
} from 'react-iframes-bridge';

// Handle specific error types
useEffect(() => {
  if (parentComm.lastError) {
    const error = parentComm.lastError;
    
    if (error instanceof SecurityError) {
      console.error('Security violation:', error.message);
    } else if (error instanceof TimeoutError) {
      console.error('Request timed out:', error.message);
    } else if (error instanceof ValidationError) {
      console.error('Invalid message:', error.message);
    }
  }
}, [parentComm.lastError]);
```

### Connection Status Monitoring

```tsx
function ConnectionStatus() {
  const { isConnected, lastError } = useParentCommunication(iframeRef, config);

  return (
    <div className="connection-status">
      <span className={isConnected ? 'connected' : 'disconnected'}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </span>
      {lastError && (
        <span className="error">Error: {lastError.message}</span>
      )}
    </div>
  );
}
```

### Message Validation

```tsx
import { z } from 'zod';

// Define validation schemas
const CartUpdateSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number()
  })),
  total: z.number()
});

// Use with validation
const config = {
  allowedOrigins: ['https://myapp.com'],
  validatePayload: true,
  validators: {
    CART_UPDATE: CartUpdateSchema
  }
};
```

## 🧪 Testing

### Testing Parent Communication

```tsx
import { render, screen } from '@testing-library/react';
import { useParentCommunication } from 'react-iframes-bridge';

// Mock the iframe communication
jest.mock('react-iframes-bridge');

function TestComponent() {
  const iframeRef = useRef();
  const parentComm = useParentCommunication(iframeRef, {
    allowedOrigins: ['*']
  });

  return (
    <div>
      <iframe ref={iframeRef} src="about:blank" />
      <span>Connected: {parentComm.isConnected ? 'Yes' : 'No'}</span>
    </div>
  );
}

test('parent communication initializes correctly', () => {
  render(<TestComponent />);
  expect(screen.getByText(/Connected:/)).toBeInTheDocument();
});
```

### Testing Child Communication

```tsx
function TestChildComponent() {
  const [received, setReceived] = useState('');
  
  const childComm = useChildCommunication({
    allowedOrigins: ['*']
  });

  useEffect(() => {
    const unsubscribe = childComm.onMessage('TEST_MESSAGE', (data) => {
      setReceived(data.text);
    });
    return unsubscribe;
  }, [childComm]);

  return <div>Received: {received}</div>;
}

test('child receives messages correctly', async () => {
  render(<TestChildComponent />);
  
  // Simulate message from parent
  window.postMessage({
    type: 'TEST_MESSAGE',
    payload: { text: 'Hello World' },
    source: 'react-iframe-bridge'
  }, '*');

  await waitFor(() => {
    expect(screen.getByText('Received: Hello World')).toBeInTheDocument();
  });
});
```

## 🔐 Security Best Practices

### 1. Always Specify Allowed Origins

```tsx
// ❌ Bad - allows any origin
const config = {
  allowedOrigins: ['*']
};

// ✅ Good - specific origins only
const config = {
  allowedOrigins: [
    'https://myapp.com',
    'https://checkout.myapp.com'
  ]
};
```

### 2. Validate Message Payloads

```tsx
const config = {
  allowedOrigins: ['https://trusted-domain.com'],
  validatePayload: true,
  maxMessageSize: 1024 * 1024, // 1MB limit
  rateLimitPerSecond: 50
};
```

### 3. Use Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="frame-ancestors 'self' https://trusted-domain.com;">
```

### 4. Implement Proper Error Handling

```tsx
useEffect(() => {
  const handleSecurityError = (error) => {
    if (error instanceof SecurityError) {
      // Log security violation
      console.error('Security violation detected:', error);
      // Notify security team
      notifySecurityTeam(error);
    }
  };

  if (parentComm.lastError) {
    handleSecurityError(parentComm.lastError);
  }
}, [parentComm.lastError]);
```

## 🚀 Performance Optimization

### 1. Message Batching

```tsx
// Batch multiple messages together
const batchedMessages = [
  { type: 'UPDATE_USER', payload: userData },
  { type: 'UPDATE_CART', payload: cartData },
  { type: 'UPDATE_PREFERENCES', payload: preferences }
];

await parentComm.sendToChild('BATCH_UPDATE', batchedMessages);
```

### 2. Message Compression

```tsx
const config = {
  allowedOrigins: ['https://myapp.com'],
  enableCompression: true, // Enable automatic compression
  maxMessageSize: 5 * 1024 * 1024 // 5MB with compression
};
```

### 3. Connection Heartbeat

```tsx
const config = {
  allowedOrigins: ['https://myapp.com'],
  enableHeartbeat: true,
  heartbeatInterval: 30000 // 30 seconds
};
```

## 📱 Cross-Platform Support

### Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+
- ✅ iOS Safari 11+
- ✅ Android Chrome 60+

### Framework Integration

#### Next.js
```tsx
import dynamic from 'next/dynamic';

const IframeComponent = dynamic(() => import('./IframeComponent'), {
  ssr: false // Disable SSR for iframe components
});
```

#### Gatsby
```tsx
import { useEffect, useState } from 'react';

function IframeComponent() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return <YourIframeComponent />;
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Messages Not Received

**Problem:** Parent/child not receiving messages

**Solution:**
```tsx
// Check iframe is loaded
useEffect(() => {
  const iframe = iframeRef.current;
  if (iframe) {
    iframe.onload = () => {
      console.log('Iframe loaded, ready to communicate');
    };
  }
}, []);

// Ensure child signals ready
useEffect(() => {
  childComm.signalReady();
}, [childComm]);
```

#### 2. Origin Errors

**Problem:** `SecurityError: Blocked a frame with origin "..." from accessing a cross-origin frame`

**Solution:**
```tsx
// Ensure origins match exactly
const config = {
  allowedOrigins: [
    'https://myapp.com',     // Exact match
    'https://www.myapp.com'  // Include www subdomain
  ]
};
```

#### 3. Timeout Errors

**Problem:** Messages timing out

**Solution:**
```tsx
const config = {
  communication: {
    timeout: 10000,      // Increase timeout
    retryAttempts: 3,    // More retry attempts
    retryDelay: 2000     // Longer delay between retries
  }
};
```

### Debug Mode

Enable debug mode to see detailed logging:

```tsx
const config = {
  allowedOrigins: ['https://myapp.com'],
  communication: { debug: true }
};
```

Debug output will show:
- Message sending/receiving
- Origin validation
- Error details
- Connection status

## 📊 Migration Guide

### From `react-iframe-comm`

```tsx
// Old way
import IframeComm from 'react-iframe-comm';

<IframeComm 
  attributes={{ src: "..." }}
  postMessageData={data}
  handleReceiveMessage={onMessage}
/>

// New way
import { useParentCommunication } from 'react-iframes-bridge';

const parentComm = useParentCommunication(iframeRef, config);

useEffect(() => {
  parentComm.sendToChild('MESSAGE_TYPE', data);
  
  const unsubscribe = parentComm.onMessage('RESPONSE', onMessage);
  return unsubscribe;
}, []);
```

### From Manual postMessage

```tsx
// Old way
useEffect(() => {
  const handleMessage = (event) => {
    if (event.origin !== 'https://trusted-domain.com') return;
    console.log(event.data);
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);

// New way
const childComm = useChildCommunication({
  allowedOrigins: ['https://trusted-domain.com']
});

useEffect(() => {
  const unsubscribe = childComm.onMessage('MESSAGE_TYPE', (data) => {
    console.log(data);
  });
  return unsubscribe;
}, []);
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/saquib/react-iframe-bridge.git
cd react-iframe-bridge
npm install
npm run build
npm test
```



## 📄 License

MIT © [Mohammad Saquib Daiyan](https://github.com/saquib34)

## 🙏 Acknowledgments

- Inspired by the [postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- Built with [TypeScript](https://www.typescriptlang.org/)
- Tested with [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/)

## 📞 Support

- 🐛 [Issue Tracker](https://github.com/saquib34/react-iframe-bridge/issues)
- 💬 [Discussions](https://github.com/saquib34/react-iframe-bridge/discussions)
- 📧 [Email Support](mailto:shadmanshahin6@gmail.com)

---

**Made with ❤️ by developers, for developers.**