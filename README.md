# NooblyJS Applications Platform

A comprehensive enterprise application platform built on a sophisticated microservices architecture that combines the NooblyJS Core service registry with a custom Application Registry to deliver a complete business application ecosystem.

## Overview

The NooblyJS Applications system provides a unified foundation for developing, deploying, and managing multiple business applications while maintaining enterprise-grade scalability, reliability, and security. The platform follows microservices-first principles with event-driven communication and centralized service discovery.

## Architecture

### Core Components

- **Application Registry**: Central orchestration layer for all business applications
- **NooblyJS Service Registry**: Foundational microservices infrastructure (11 core services)
- **Business Applications**: Six specialized applications for different business domains
- **Multi-Layer Security**: Comprehensive authentication and authorization framework
- **Event-Driven Communication**: Asynchronous messaging across all components

### Business Applications

The platform includes six pre-built business applications:

1. **Marketing Application** (`/applications/marketing`)
   - Email campaign management
   - Customer segmentation
   - Analytics and reporting

2. **Customer Service Application** (`/applications/customerservice`)
   - Support ticket management
   - Case tracking and resolution
   - Queue management system

3. **Delivery Application** (`/applications/delivery`)
   - Order tracking and status management
   - Delivery route optimization
   - Real-time shipment monitoring

4. **Warehouse Application** (`/applications/warehouse`)
   - Inventory management
   - Stock control and fulfillment
   - Product catalog management

5. **Infrastructure Application** (`/applications/infrastructure`)
   - Server monitoring and management
   - Database administration
   - System health tracking

6. **Wiki Application** (`/applications/wiki`)
   - Knowledge base management
   - Document collaboration
   - Content search and indexing

## Features

### Application Registry Features

- **Unified Application Management**: Centralized registration, initialization, and lifecycle management
- **Service Discovery**: Automatic service location and health monitoring  
- **Cross-Application Integration**: Event-based communication between applications
- **API Authentication**: Multi-method API key validation with rate limiting
- **Hot Reloading**: Dynamic application loading without system restart

### NooblyJS Core Services

The platform leverages 11 core microservices:

- **Caching Service**: Multi-provider caching (Redis, Memcached, In-Memory)
- **DataServe Service**: Database abstraction (PostgreSQL, MySQL, MongoDB, Redis)
- **Filing Service**: File storage management (Local, AWS S3, Azure, Google Cloud)
- **Logging Service**: Structured logging (Console, File, Elasticsearch, Splunk)
- **Queue Service**: Message queuing (RabbitMQ, Redis, In-Memory)
- **Scheduling Service**: Task scheduling and cron job management
- **Searching Service**: Full-text search and indexing
- **Measuring Service**: Metrics collection and monitoring
- **Notifying Service**: Multi-channel notifications (Email, SMS, Slack, Webhooks)
- **Working Service**: Background job processing with auto-scaling
- **Workflow Service**: Multi-step process orchestration

### Security Features

- **Multi-Layer Authentication**: Session-based and API key authentication
- **CORS Protection**: Cross-origin request security
- **Rate Limiting**: API throttling and quota management
- **Input Validation**: Request sanitization and validation
- **Session Management**: Secure session handling with configurable storage

## Implementation Strategies for Consumers

### Getting Started

1. **Installation**
   ```bash
   npm install
   ```

2. **Development Mode**
   ```bash
   npm run dev:web
   ```

3. **Production Mode**
   ```bash
   npm start
   ```

### Creating Custom Applications

#### 1. Application Factory Pattern

```javascript
// applications/my-application/index.js
module.exports = function createMyApplication(options, eventEmitter, serviceRegistry) {
    const app = {
        name: 'my-application',
        version: '1.0.0',
        
        // Service Dependencies
        log: serviceRegistry.logger('console'),
        cache: serviceRegistry.cache('memory'),
        dataserve: serviceRegistry.dataServe('memory'),
        
        initialize() {
            this.setupRoutes();
            this.registerEventHandlers();
        },
        
        setupRoutes() {
            options['express-app'].use('/applications/my-app', /* routes */);
        }
    };
    
    app.initialize();
    return app;
};
```

#### 2. Service Integration

```javascript
// Using core services in your application
const log = serviceRegistry.logger('console');
const cache = serviceRegistry.cache('redis');
const dataserve = serviceRegistry.dataServe('postgresql');
const queue = serviceRegistry.queue('rabbitmq');

// Cache management
await cache.set('key', 'value', 3600);
const value = await cache.get('key');

// Database operations
const records = await dataserve.find('users', { active: true });
await dataserve.create('users', { name: 'John', email: 'john@example.com' });

// Queue processing
await queue.push('email-queue', { to: 'user@example.com', subject: 'Welcome' });
```

#### 3. Event-Driven Communication

```javascript
// Publishing events
eventEmitter.emit('user-registered', {
    userId: 123,
    email: 'user@example.com',
    timestamp: new Date().toISOString()
});

// Subscribing to events
eventEmitter.on('order-created', (orderData) => {
    // Handle order creation across applications
    log.info('New order received:', orderData);
});
```

### Frontend Integration Strategies

#### 1. Single Page Application Pattern

Each application follows a consistent frontend architecture:

```javascript
// public/applications/my-app/js/app.js
class MyApplication {
    constructor() {
        this.authenticated = false;
        this.currentView = 'dashboard';
    }
    
    async init() {
        await this.checkAuthentication();
        this.bindEvents();
        this.showView(this.currentView);
    }
    
    async checkAuthentication() {
        const response = await fetch('/api/my-app/auth/check');
        const result = await response.json();
        this.authenticated = result.authenticated;
    }
}
```

#### 2. API Integration

```javascript
// Standard API integration pattern
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
            'x-api-key': 'your-api-key'
        };
    }
    
    async get(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: this.headers
        });
        return response.json();
    }
    
    async post(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        return response.json();
    }
}
```

### Configuration and Customization

#### 1. Service Configuration

```javascript
// Configure services with specific providers
const serviceRegistry = require('noobly-core');

// Production configuration
const cache = serviceRegistry.cache('redis', {
    host: 'redis-cluster.example.com',
    port: 6379,
    password: process.env.REDIS_PASSWORD
});

const dataserve = serviceRegistry.dataServe('postgresql', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});
```

#### 2. Authentication Customization

```javascript
// Custom authentication middleware
const customAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!validateApiKey(apiKey)) {
        return res.status(401).json({
            error: 'Invalid API key',
            code: 'UNAUTHORIZED'
        });
    }
    
    req.user = getUserByApiKey(apiKey);
    next();
};
```

### Deployment Strategies

#### 1. Development Environment

```bash
# Local development with hot reloading
npm run dev:web

# Access applications at:
# http://localhost:3001/applications/marketing
# http://localhost:3001/applications/customerservice
# http://localhost:3001/applications/delivery
```

#### 2. Production Deployment

```bash
# Environment variables
export NODE_ENV=production
export PORT=3001
export DB_HOST=prod-db.example.com
export REDIS_HOST=prod-redis.example.com

# Start production server
npm start
```

#### 3. Container Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Monitoring and Observability

The platform provides comprehensive monitoring capabilities:

```javascript
// Metrics collection
const measuring = serviceRegistry.measuring('prometheus');
measuring.counter('requests_total').inc();
measuring.histogram('request_duration').observe(responseTime);

// Structured logging
const log = serviceRegistry.logger('elasticsearch');
log.info('User action', {
    userId: 123,
    action: 'login',
    timestamp: new Date().toISOString(),
    ip: req.ip
});

// Health checks
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: dataserve.isHealthy(),
            cache: cache.isHealthy(),
            queue: queue.isHealthy()
        }
    };
    res.json(health);
});
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Core Library**: NooblyJS Core 1.2.5
- **Session Management**: express-session
- **Body Parsing**: body-parser
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- [System Architecture](docs/System%20Architecture.md)
- [Application Requirements](docs/Applications%20Requirements%20Document.md)
- [NooblyJS Core Usage Guide](docs/Noobly%20Core%20Usage%20Guide.md)
- [Individual Application Documentation](docs/)

## Contributing

The platform follows enterprise development standards with comprehensive testing and documentation requirements. See individual application documentation for module-specific contribution guidelines.

## License

Enterprise application platform with proprietary licensing. Contact the NooblyJS Core Team for licensing information.