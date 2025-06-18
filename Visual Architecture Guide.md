# 🎨 Visual Architecture Guide

## System Architecture Overview

```mermaid
graph TB
    subgraph "Parent Application"
        PA[React Parent App] --> PH[Parent Hooks]
        PH --> UPC[useParentCommunication]
        PH --> USS1[useSharedState]
        PA --> SI[SecureIframe Component]
        SI --> USS1
        UPC --> MM1[MessageManager]
        USS1 --> MM1
        MM1 --> SM1[SecurityManager]
    end
    
    subgraph "Communication Layer"
        SM1 --> PMB[PostMessage Bridge]
        PMB --> OV[Origin Validation]
        OV --> PS[Payload Serialization]
        PS --> MQ[Message Queue]
        MQ --> NL[Network Layer]
    end
    
    subgraph "Child Application"
        NL --> SM2[SecurityManager]
        SM2 --> MM2[MessageManager]
        MM2 --> UCC[useChildCommunication]
        MM2 --> USS2[useSharedState]
        UCC --> CH[Child Hooks]
        USS2 --> CH
        CH --> CA[React Child App]
    end
    
    style PA fill:#e3f2fd
    style CA fill:#f3e5f5
    style PMB fill:#fff3e0
    style OV fill:#ffebee
    style PS fill:#e8f5e8
```

## Communication Flow Diagrams

### 1. Initial Handshake Flow

```mermaid
sequenceDiagram
    participant P as Parent App
    participant PI as Parent Iframe
    participant CI as Child Iframe
    participant C as Child App
    
    Note over P,C: Initialization Sequence
    
    P->>PI: Load iframe with src
    PI->>CI: HTTP Request
    CI->>C: Load child application
    C->>C: Initialize useChildCommunication
    C->>CI: Send IFRAME_READY signal
    CI->>PI: PostMessage IFRAME_READY
    PI->>P: Trigger onReady callback
    P->>P: Update isConnected = true
    
    Note over P,C: Ready for communication
    
    P->>PI: Send initial data
    PI->>CI: PostMessage with data
    CI->>C: Deliver to message handlers
```

### 2. Message Exchange Flow

```mermaid
sequenceDiagram
    participant P as Parent
    participant PM as Parent MessageManager
    participant SM1 as Security Layer 1
    participant NW as Network (PostMessage)
    participant SM2 as Security Layer 2
    participant CM as Child MessageManager
    participant C as Child
    
    P->>PM: sendToChild("USER_UPDATE", data)
    PM->>PM: Generate message ID
    PM->>SM1: Validate payload size
    PM->>SM1: Check rate limits
    SM1->>PM: Validation passed
    PM->>NW: postMessage(serialized)
    
    NW->>SM2: Receive message event
    SM2->>SM2: Validate origin
    SM2->>SM2: Validate message structure
    SM2->>CM: Forward validated message
    CM->>CM: Deserialize payload
    CM->>C: Trigger message handler
    
    Note over C: Process message
    
    C->>CM: Send response (optional)
    CM->>NW: postMessage response
    NW->>PM: Receive response
    PM->>P: Resolve promise
```

### 3. Shared State Synchronization

```mermaid
sequenceDiagram
    participant P as Parent State
    participant PSS as Parent useSharedState
    participant PM as Parent MessageManager
    participant CM as Child MessageManager
    participant CSS as Child useSharedState
    participant C as Child State
    
    Note over P,C: State Update Flow
    
    P->>PSS: setValue(newValue)
    PSS->>PSS: Update local state
    PSS->>PM: Send SHARED_STATE_UPDATE
    PM->>CM: PostMessage
    CM->>CSS: Receive update
    CSS->>CSS: Check timestamp
    CSS->>C: Update local state
    
    Note over P,C: Bidirectional sync
    
    C->>CSS: setValue(anotherValue)
    CSS->>CSS: Update local state
    CSS->>CM: Send SHARED_STATE_UPDATE
    CM->>PM: PostMessage
    PM->>PSS: Receive update
    PSS->>P: Update local state
```

### 4. Error Handling Flow

```mermaid
graph TD
    A[Message Sent] --> B{Origin Valid?}
    B -->|No| C[SecurityError]
    B -->|Yes| D{Payload Valid?}
    D -->|No| E[ValidationError]
    D -->|Yes| F{Rate Limit OK?}
    F -->|No| G[RateLimitError]
    F -->|Yes| H[Send Message]
    
    H --> I{Delivered?}
    I -->|No| J[ConnectionError]
    I -->|Yes| K{Response Expected?}
    K -->|No| L[Success]
    K -->|Yes| M{Timeout?}
    M -->|Yes| N[TimeoutError]
    M -->|No| O[Wait for Response]
    O --> P{Response Received?}
    P -->|Yes| L
    P -->|No| M
    
    C --> Q[Error Handler]
    E --> Q
    G --> Q
    J --> Q
    N --> Q
    Q --> R[Retry Logic]
    R --> S{Max Retries?}
    S -->|No| A
    S -->|Yes| T[Final Error]
```

## Component Architecture

### 1. useParentCommunication Hook Architecture

```mermaid
graph TB
    subgraph "useParentCommunication Hook"
        A[Hook Entry Point] --> B[Initialize State]
        B --> C[Create MessageManager]
        B --> D[Create SecurityManager]
        B --> E[Setup Event Listeners]
        
        C --> F[Message Queue]
        C --> G[Pending Requests]
        C --> H[Response Handlers]
        
        D --> I[Origin Validation]
        D --> J[Rate Limiting]
        D --> K[Payload Validation]
        
        E --> L[PostMessage Listener]
        L --> M[Message Router]
        M --> N[Event Handlers]
        M --> O[Response Resolver]
        
        F --> P[sendToChild]
        G --> Q[requestFromChild]
        H --> R[onMessage]
        N --> S[User Handlers]
    end
    
    style A fill:#e1f5fe
    style P fill:#c8e6c9
    style Q fill:#c8e6c9
    style R fill:#c8e6c9
```

### 2. useSharedState Hook Architecture

```mermaid
graph TB
    subgraph "useSharedState Hook"
        A[Hook Entry Point] --> B{isParent?}
        B -->|Yes| C[useParentCommunication]
        B -->|No| D[useChildCommunication]
        
        C --> E[Parent State Manager]
        D --> F[Child State Manager]
        
        E --> G[State Synchronizer]
        F --> G
        
        G --> H[Message Handlers]
        G --> I[State Validators]
        G --> J[Conflict Resolvers]
        
        H --> K[UPDATE_STATE Handler]
        H --> L[REQUEST_STATE Handler]
        
        I --> M[Payload Validation]
        I --> N[Type Checking]
        
        J --> O[Timestamp Comparison]
        J --> P[Merge Strategies]
        
        E --> Q[setValue Function]
        F --> Q
        Q --> R[Local State Update]
        R --> S[Broadcast to Other Side]
    end
    
    style A fill:#f3e5f5
    style Q fill:#ffecb3
    style R fill:#ffecb3
    style S fill:#ffecb3
```

### 3. SecureIframe Component Architecture

```mermaid
graph TB
    subgraph "SecureIframe Component"
        A[Component Mount] --> B[Create Iframe Ref]
        B --> C[Initialize useParentCommunication]
        C --> D[Setup Event Handlers]
        
        D --> E[onReady Handler]
        D --> F[onError Handler]
        D --> G[onMessage Handler]
        
        E --> H[Ready State Management]
        F --> I[Error State Management]
        G --> J[Message Routing]
        
        H --> K[Trigger onReady Callback]
        I --> L[Trigger onError Callback]
        J --> M[Trigger onMessage Callback]
        
        A --> N[Render Iframe Element]
        N --> O[Apply Security Attributes]
        O --> P[Apply Styles]
        P --> Q[Forward Ref]
        
        Q --> R[Exposed API]
        R --> S[communication: ParentCommunicationHook]
        R --> T[iframe: HTMLIFrameElement]
    end
    
    style A fill:#fff3e0
    style R fill:#e8f5e8
```

## Data Flow Patterns

### 1. One-Way Data Flow (Parent → Child)

```mermaid
graph LR
    A[Parent State] --> B[sendToChild]
    B --> C[PostMessage]
    C --> D[Child onMessage]
    D --> E[Child State Update]
    
    style A fill:#e3f2fd
    style E fill:#f3e5f5
    style C fill:#fff3e0
```

### 2. Request-Response Pattern

```mermaid
graph LR
    A[Parent Request] --> B[requestFromChild]
    B --> C[PostMessage Request]
    C --> D[Child onMessage]
    D --> E[Child Processing]
    E --> F[respondToParent]
    F --> G[PostMessage Response]
    G --> H[Parent Promise Resolve]
    
    style A fill:#e3f2fd
    style H fill:#e3f2fd
    style E fill:#f3e5f5
    style C fill:#fff3e0
    style G fill:#fff3e0
```

### 3. Bidirectional State Sync

```mermaid
graph TB
    A[Parent useSharedState] <--> B[Sync Bridge]
    B <--> C[Child useSharedState]
    
    A --> D[Local State A]
    C --> E[Local State B]
    
    D -.->|Auto Sync| E
    E -.->|Auto Sync| D
    
    style A fill:#e3f2fd
    style C fill:#f3e5f5
    style B fill:#fff3e0
```

## Security Architecture

### 1. Security Layers

```mermaid
graph TB
    subgraph "Security Architecture"
        A[Incoming Message] --> B[Layer 1: Origin Validation]
        B --> C{Origin Allowed?}
        C -->|No| D[Reject Message]
        C -->|Yes| E[Layer 2: Rate Limiting]
        
        E --> F{Within Rate Limit?}
        F -->|No| G[Throttle Message]
        F -->|Yes| H[Layer 3: Size Validation]
        
        H --> I{Size OK?}
        I -->|No| J[Reject Large Message]
        I -->|Yes| K[Layer 4: Content Validation]
        
        K --> L{Payload Valid?}
        L -->|No| M[Reject Invalid Payload]
        L -->|Yes| N[Layer 5: Sanitization]
        
        N --> O[Sanitize Content]
        O --> P[Process Message]
    end
    
    style D fill:#ffcdd2
    style G fill:#fff3e0
    style J fill:#ffcdd2
    style M fill:#ffcdd2
    style P fill:#c8e6c9
```

### 2. Origin Validation Flow

```mermaid
graph TD
    A[Message Event] --> B[Extract Origin]
    B --> C[Get Allowed Origins]
    C --> D{Origin in Allowed List?}
    D -->|Yes| E{Exact Match?}
    D -->|No| F[Check Wildcard Patterns]
    E -->|Yes| G[Allow Message]
    E -->|No| H[Deny Message]
    F --> I{Pattern Match?}
    I -->|Yes| G
    I -->|No| H
    
    G --> J[Continue Processing]
    H --> K[Log Security Event]
    K --> L[Throw SecurityError]
    
    style G fill:#c8e6c9
    style H fill:#ffcdd2
    style K fill:#ffecb3
```

## Performance Optimization Flow

### 1. Message Batching

```mermaid
graph TD
    A[Multiple setValue Calls] --> B[Debounce Timer]
    B --> C{Timer Expired?}
    C -->|No| D[Add to Batch]
    C -->|Yes| E[Process Batch]
    
    D --> F[Reset Timer]
    F --> C
    
    E --> G[Combine Messages]
    G --> H[Single PostMessage]
    H --> I[Child Processes Batch]
    I --> J[Update Multiple States]
    
    style E fill:#c8e6c9
    style H fill:#fff3e0
    style J fill:#f3e5f5
```

### 2. Memory Management

```mermaid
graph TD
    A[Component Mount] --> B[Create Subscriptions]
    B --> C[Store Cleanup Functions]
    C --> D[Component Active]
    
    D --> E{Component Unmount?}
    E -->|No| D
    E -->|Yes| F[Execute Cleanup Functions]
    
    F --> G[Remove Event Listeners]
    G --> H[Clear Message Queues]
    H --> I[Cancel Pending Requests]
    I --> J[Clear Timers]
    J --> K[Release References]
    K --> L[Memory Freed]
    
    style F fill:#ffecb3
    style L fill:#c8e6c9
```

## Real-World Implementation Examples

### 1. E-commerce Checkout Flow

```mermaid
sequenceDiagram
    participant MS as Main Store
    participant SC as Shopping Cart
    participant CI as Checkout Iframe
    participant PP as Payment Processor
    participant DB as Database
    
    Note over MS,DB: Complete Checkout Flow
    
    MS->>SC: Add items to cart
    SC->>SC: Update cart state (useSharedState)
    SC->>CI: Auto-sync cart data
    CI->>CI: Display checkout form
    
    Note over CI: User fills payment details
    
    CI->>PP: Process payment
    PP->>CI: Payment result
    CI->>SC: Send PAYMENT_COMPLETE
    SC->>MS: Update order status
    MS->>DB: Save order
    DB->>MS: Confirm save
    MS->>SC: Display success message
```

### 2. Multi-Widget Dashboard

```mermaid
graph TB
    subgraph "Dashboard Parent"
        A[Dashboard App] --> B[Theme Manager]
        A --> C[Data Provider]
        A --> D[Widget Container 1]
        A --> E[Widget Container 2]
        A --> F[Widget Container 3]
    end
    
    subgraph "Widget 1: Analytics"
        D --> G[Analytics Iframe]
        G --> H[Charts Component]
        G --> I[Data Filters]
    end
    
    subgraph "Widget 2: User Management"
        E --> J[Users Iframe]
        J --> K[User List]
        J --> L[User Editor]
    end
    
    subgraph "Widget 3: Settings"
        F --> M[Settings Iframe]
        M --> N[Config Panel]
        M --> O[Theme Selector]
    end
    
    B -.->|Theme Sync| G
    B -.->|Theme Sync| J
    B -.->|Theme Sync| M
    
    C -.->|Data Sync| H
    C -.->|Data Sync| K
    
    style A fill:#e3f2fd
    style G fill:#f3e5f5
    style J fill:#f3e5f5
    style M fill:#f3e5f5
```

### 3. Social Login Widget

```mermaid
sequenceDiagram
    participant MA as Main App
    participant LI as Login Iframe
    participant SP as Social Provider
    participant API as Auth API
    
    Note over MA,API: Social Login Flow
    
    MA->>LI: Load social login widget
    LI->>MA: Signal ready
    MA->>LI: Send config (clientId, redirectUrl)
    
    Note over LI: User clicks "Login with Google"
    
    LI->>SP: Open popup for OAuth
    SP->>SP: User authenticates
    SP->>LI: Return auth code
    LI->>API: Exchange code for token
    API->>LI: Return user data + token
    LI->>MA: Send LOGIN_SUCCESS event
    MA->>MA: Update user state
    MA->>LI: Send welcome message
```

## Performance Monitoring Dashboard

### 1. Metrics Collection Flow

```mermaid
graph TD
    A[Communication Events] --> B[Metrics Collector]
    B --> C[Message Count]
    B --> D[Latency Tracking]
    B --> E[Error Rate]
    B --> F[Queue Size]
    
    C --> G[Performance Dashboard]
    D --> G
    E --> G
    F --> G
    
    G --> H[Real-time Charts]
    G --> I[Alert System]
    G --> J[Historical Data]
    
    I --> K{Threshold Exceeded?}
    K -->|Yes| L[Send Alert]
    K -->|No| M[Continue Monitoring]
    
    style B fill:#fff3e0
    style G fill:#e8f5e8
    style L fill:#ffcdd2
```

### 2. Memory Usage Tracking

```mermaid
graph TB
    subgraph "Memory Monitoring"
        A[Hook Instances] --> B[Track Subscriptions]
        A --> C[Track Pending Requests]
        A --> D[Track Message Queue]
        
        B --> E[Subscription Count]
        C --> F[Request Count]
        D --> G[Queue Size]
        
        E --> H[Memory Calculator]
        F --> H
        G --> H
        
        H --> I{Memory Threshold?}
        I -->|High| J[Trigger Cleanup]
        I -->|Normal| K[Continue]
        
        J --> L[Clear Old Messages]
        J --> M[Cancel Stale Requests]
        J --> N[Optimize Subscriptions]
    end
    
    style H fill:#fff3e0
    style J fill:#ffecb3
```

## Error Recovery Patterns

### 1. Connection Recovery Flow

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: startConnection()
    Connecting --> Connected: connectionSuccess()
    Connecting --> Error: connectionFailed()
    Connected --> Error: communicationError()
    Error --> Reconnecting: autoRetry()
    Reconnecting --> Connected: retrySuccess()
    Reconnecting --> Failed: maxRetriesExceeded()
    Failed --> Disconnected: resetConnection()
    Connected --> Disconnected: manualDisconnect()
```

### 2. Message Retry Logic

```mermaid
graph TD
    A[Send Message] --> B{Delivery Successful?}
    B -->|Yes| C[Complete]
    B -->|No| D[Increment Retry Count]
    D --> E{Max Retries Reached?}
    E -->|No| F[Wait Retry Delay]
    F --> G[Exponential Backoff]
    G --> A
    E -->|Yes| H[Final Failure]
    H --> I[Trigger Error Handler]
    
    style C fill:#c8e6c9
    style H fill:#ffcdd2
    style G fill:#fff3e0
```

## Development Workflow

### 1. Testing Strategy Flow

```mermaid
graph TB
    subgraph "Testing Pyramid"
        A[Unit Tests] --> B[Integration Tests]
        B --> C[E2E Tests]
        C --> D[Performance Tests]
    end
    
    subgraph "Test Environment"
        E[Mock Parent] --> F[Test Communication]
        F --> G[Mock Child]
        
        H[Real Parent] --> I[Test Integration]
        I --> J[Real Child]
    end
    
    subgraph "CI/CD Pipeline"
        K[Code Commit] --> L[Run Unit Tests]
        L --> M[Run Integration Tests]
        M --> N[Run E2E Tests]
        N --> O[Performance Benchmarks]
        O --> P{All Tests Pass?}
        P -->|Yes| Q[Deploy]
        P -->|No| R[Block Deployment]
    end
    
    style Q fill:#c8e6c9
    style R fill:#ffcdd2
```

### 2. Debugging Workflow

```mermaid
graph TD
    A[Issue Reported] --> B[Enable Debug Mode]
    B --> C[Collect Logs]
    C --> D[Analyze Communication Flow]
    D --> E{Message Sent?}
    E -->|No| F[Check Parent Hook]
    E -->|Yes| G{Message Received?}
    G -->|No| H[Check Network/Origin]
    G -->|Yes| I{Handler Called?}
    I -->|No| J[Check Message Type]
    I -->|Yes| K{Expected Behavior?}
    K -->|No| L[Debug Handler Logic]
    K -->|Yes| M[Issue Resolved]
    
    F --> N[Fix Parent Code]
    H --> O[Fix Configuration]
    J --> P[Fix Message Routing]
    L --> Q[Fix Business Logic]
    
    N --> M
    O --> M
    P --> M
    Q --> M
    
    style M fill:#c8e6c9
```

## Deployment Architecture

### 1. Multi-Environment Setup

```mermaid
graph TB
    subgraph "Development"
        A[Local Parent] --> B[Local Child]
        A --> C[Mock Services]
    end
    
    subgraph "Staging"
        D[Staging Parent] --> E[Staging Child]
        D --> F[Staging APIs]
    end
    
    subgraph "Production"
        G[Prod Parent] --> H[Prod Child]
        G --> I[Prod APIs]
        H --> J[CDN Resources]
    end
    
    subgraph "Configuration"
        K[Dev Config] --> A
        L[Staging Config] --> D
        M[Prod Config] --> G
    end
    
    style K fill:#e3f2fd
    style L fill:#fff3e0
    style M fill:#ffcdd2
```

### 2. CDN and Caching Strategy

```mermaid
graph TB
    subgraph "Parent Domain"
        A[Parent App] --> B[Library Bundle]
        B --> C[Component Cache]
    end
    
    subgraph "Child Domain"
        D[Child App] --> E[Library Bundle]
        E --> F[Component Cache]
    end
    
    subgraph "CDN Layer"
        G[Global CDN] --> H[Regional CDN]
        H --> I[Edge Cache]
    end
    
    B --> G
    E --> G
    I --> J[Browser Cache]
    
    style G fill:#e8f5e8
    style J fill:#fff3e0
```

## Monitoring and Observability

### 1. Real-time Monitoring Dashboard

```mermaid
graph TB
    subgraph "Data Collection"
        A[Communication Events] --> B[Metrics Aggregator]
        C[Error Events] --> B
        D[Performance Data] --> B
    end
    
    subgraph "Processing"
        B --> E[Time Series DB]
        B --> F[Error Tracking]
        B --> G[Log Aggregation]
    end
    
    subgraph "Visualization"
        E --> H[Grafana Dashboard]
        F --> I[Error Dashboard]
        G --> J[Log Viewer]
    end
    
    subgraph "Alerting"
        H --> K[Alert Manager]
        I --> K
        K --> L[Slack Notifications]
        K --> M[Email Alerts]
        K --> N[PagerDuty]
    end
    
    style B fill:#fff3e0
    style K fill:#ffecb3
```

### 2. Performance Tracking

```mermaid
graph LR
    A[Message Sent] --> B[Start Timer]
    B --> C[Message Processing]
    C --> D[Response Received]
    D --> E[End Timer]
    E --> F[Calculate Latency]
    F --> G[Update Metrics]
    G --> H[Performance Dashboard]
    
    style F fill:#e8f5e8
    style H fill:#e3f2fd
```

This comprehensive visual guide covers all aspects of the iframe bridge library architecture, from high-level system design to detailed implementation flows, error handling, testing strategies, and deployment considerations! 📊🎨