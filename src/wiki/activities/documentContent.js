/**
 * @fileoverview Default document content for wiki initialization
 * Contains markdown content for sample documents
 * 
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-08-25
 */

'use strict';

const defaultDocumentContent = {
  1: `# Microservices Architecture Overview

## Introduction

This document provides a comprehensive overview of our microservices architecture, including design principles, service boundaries, and communication patterns.

## Core Principles

### 1. Single Responsibility
Each microservice should have a single, well-defined responsibility that aligns with business capabilities.

### 2. Autonomy
Services should be independently deployable and maintainable, with minimal external dependencies.

### 3. Decentralization
Avoid centralized data management and governance. Each service manages its own data.

## Service Architecture

\`\`\`javascript
// Example service structure
class UserService {
  constructor() {
    this.database = new UserDatabase();
    this.eventBus = new EventBus();
  }

  async createUser(userData) {
    const user = await this.database.create(userData);
    await this.eventBus.publish('user.created', user);
    return user;
  }
}
\`\`\`

## Communication Patterns

### Synchronous Communication
- REST APIs for request-response patterns
- GraphQL for flexible data fetching

### Asynchronous Communication
- Event-driven messaging for loose coupling
- Message queues for reliable processing

## Best Practices

1. **API Versioning**: Always version your APIs to maintain backward compatibility
2. **Circuit Breakers**: Implement circuit breakers to handle service failures gracefully
3. **Monitoring**: Comprehensive logging and metrics collection
4. **Security**: Implement proper authentication and authorization at the service level

## Conclusion

Following these architectural principles ensures our microservices are scalable, maintainable, and resilient.`,

  2: `# User Authentication Requirements

## Overview

This document outlines the requirements for implementing multi-factor authentication (MFA) across all client applications in our ecosystem.

## Functional Requirements

### Primary Authentication
- Username/email and password combination
- Password strength requirements (minimum 12 characters, mixed case, numbers, symbols)
- Account lockout after 5 failed attempts

### Multi-Factor Authentication
- Support for TOTP (Time-based One-Time Password)
- SMS-based verification codes
- Hardware security keys (FIDO2/WebAuthn)
- Backup codes for account recovery

### Session Management
- JWT tokens with 15-minute expiration
- Refresh token rotation
- Secure session storage
- Single sign-on (SSO) across applications

## Security Requirements

### Data Protection
- All passwords must be hashed using bcrypt with salt
- Personal information encrypted at rest
- Secure transmission over HTTPS only

### Compliance
- GDPR compliance for European users
- SOC 2 Type II requirements
- Regular security audits

## User Experience Requirements

### Login Flow
1. User enters credentials
2. System validates and prompts for MFA
3. User provides second factor
4. System grants access with appropriate session

### Error Handling
- Clear, user-friendly error messages
- No information disclosure about account existence
- Progressive delays for repeated failures

## Technical Implementation

### Database Schema
\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### API Endpoints
- POST /auth/login - Primary authentication
- POST /auth/mfa/verify - MFA verification
- POST /auth/refresh - Token refresh
- POST /auth/logout - Session termination

## Acceptance Criteria

- [ ] Users can log in with email/password
- [ ] MFA can be enabled/disabled by users
- [ ] Account lockout prevents brute force attacks
- [ ] Sessions expire appropriately
- [ ] All authentication events are logged`,

  3: `# React Component Library Standards

## Overview

This document outlines the standards and best practices for building reusable React components with TypeScript in our component library.

## Component Architecture

### File Structure
\`\`\`
components/
├── Button/
│   ├── Button.tsx
│   ├── Button.stories.tsx
│   ├── Button.test.tsx
│   ├── Button.module.css
│   └── index.ts
└── index.ts
\`\`\`

### Component Template
\`\`\`typescript
import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps {
  /**
   * Button content
   */
  children: React.ReactNode;
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'danger';
  /**
   * Button size
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Click handler
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  ...props
}) => {
  return (
    <button
      className={cn(
        styles.button,
        styles[\`button--\${variant}\`],
        styles[\`button--\${size}\`],
        disabled && styles[\`button--disabled\`]
      )}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
\`\`\`

## Styling Standards

### CSS Modules
- Use CSS modules for component styling
- Follow BEM methodology for class names
- Use CSS custom properties for theming

### Design Tokens
\`\`\`css
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-danger: #dc3545;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  
  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
}
\`\`\`

## Testing Requirements

### Unit Tests
- Test all component props and variants
- Test user interactions and event handlers
- Test accessibility features

### Storybook Stories
- Create stories for all component variants
- Include interactive controls
- Document usage examples

## Accessibility Guidelines

1. **Semantic HTML**: Use appropriate HTML elements
2. **ARIA Labels**: Provide descriptive labels for screen readers
3. **Keyboard Navigation**: Ensure all interactions work with keyboard
4. **Color Contrast**: Meet WCAG AA standards
5. **Focus Management**: Visible focus indicators

## Performance Best Practices

1. **React.memo**: Use for expensive components
2. **Lazy Loading**: Code split large components
3. **Bundle Analysis**: Monitor component bundle sizes
4. **Tree Shaking**: Export only necessary components

## Documentation Standards

- JSDoc comments for all props
- Usage examples in README
- Migration guides for breaking changes
- Performance considerations`,

  4: `# Wiki API Specification

## Overview

This document describes the REST API endpoints for the wiki system, including authentication, spaces management, and document operations.

## Base URL

\`\`\`
https://api.example.com/applications/wiki
\`\`\`

## Authentication

All API endpoints require authentication via session cookies or API keys.

### Login
\`\`\`http
POST /login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
\`\`\`

### Logout
\`\`\`http
POST /logout
\`\`\`

### Check Authentication
\`\`\`http
GET /api/auth/check
\`\`\`

## Spaces API

### List Spaces
\`\`\`http
GET /api/spaces

Response:
[
  {
    "id": 1,
    "name": "Architecture Documentation",
    "description": "Enterprise architecture patterns",
    "icon": "🏗️",
    "visibility": "team",
    "documentCount": 24,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-08-20T14:30:00Z",
    "author": "Solution Architect"
  }
]
\`\`\`

### Create Space
\`\`\`http
POST /api/spaces
Content-Type: application/json

{
  "name": "New Space",
  "description": "Space description",
  "visibility": "team"
}
\`\`\`

### Get Space Documents
\`\`\`http
GET /api/spaces/{id}/documents

Response:
[
  {
    "id": 1,
    "title": "Document Title",
    "excerpt": "Document preview...",
    "author": "Author Name",
    "modifiedAt": "2024-08-20T14:30:00Z"
  }
]
\`\`\`

## Documents API

### List Documents
\`\`\`http
GET /api/documents

Response:
[
  {
    "id": 1,
    "title": "Document Title",
    "spaceId": 1,
    "spaceName": "Space Name",
    "excerpt": "Document preview...",
    "author": "Author Name",
    "createdAt": "2024-08-15T10:00:00Z",
    "modifiedAt": "2024-08-20T14:30:00Z",
    "views": 45,
    "tags": ["tag1", "tag2"]
  }
]
\`\`\`

### Get Document
\`\`\`http
GET /api/documents/{id}

Response:
{
  "id": 1,
  "title": "Document Title",
  "content": "# Markdown content...",
  "spaceId": 1,
  "spaceName": "Space Name",
  "author": "Author Name",
  "createdAt": "2024-08-15T10:00:00Z",
  "modifiedAt": "2024-08-20T14:30:00Z",
  "views": 45,
  "tags": ["tag1", "tag2"]
}
\`\`\`

### Create Document
\`\`\`http
POST /api/documents
Content-Type: application/json

{
  "title": "New Document",
  "content": "# Markdown content",
  "spaceId": 1,
  "tags": ["tag1", "tag2"]
}
\`\`\`

### Update Document
\`\`\`http
PUT /api/documents
Content-Type: application/json

{
  "id": 1,
  "title": "Updated Title",
  "content": "# Updated content",
  "spaceId": 1,
  "tags": ["tag1", "tag2"]
}
\`\`\`

## Search API

### Search Documents
\`\`\`http
GET /api/search?q=query

Response:
[
  {
    "id": 1,
    "title": "Document Title",
    "excerpt": "Matching excerpt...",
    "spaceName": "Space Name",
    "modifiedAt": "2024-08-20T14:30:00Z",
    "tags": ["tag1", "tag2"],
    "relevance": 0.9
  }
]
\`\`\`

## Analytics API

### Recent Documents
\`\`\`http
GET /api/documents/recent

Response:
[
  {
    "id": 5,
    "title": "Recent Document",
    "spaceName": "Space Name",
    "modifiedAt": "2024-08-23T10:30:00Z"
  }
]
\`\`\`

### Popular Documents
\`\`\`http
GET /api/documents/popular

Response:
[
  {
    "id": 3,
    "title": "Popular Document",
    "spaceName": "Space Name",
    "views": 58
  }
]
\`\`\`

## Error Responses

### 400 Bad Request
\`\`\`json
{
  "success": false,
  "message": "Validation error message"
}
\`\`\`

### 401 Unauthorized
\`\`\`json
{
  "success": false,
  "message": "Authentication required"
}
\`\`\`

### 404 Not Found
\`\`\`json
{
  "error": "Document not found"
}
\`\`\`

### 500 Internal Server Error
\`\`\`json
{
  "error": "Internal server error"
}
\`\`\`

## Rate Limiting

- 1000 requests per hour per IP
- 100 requests per minute per authenticated user
- Search queries limited to 60 per minute

## Response Headers

\`\`\`
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1629123456
\`\`\``,

  5: `# Architecture Review - August 2024

## Meeting Information

**Date**: August 23, 2024  
**Time**: 10:00 AM - 11:30 AM  
**Attendees**: Enterprise Architect, Solution Architect, Tech Lead, DevOps Engineer  
**Meeting Type**: Monthly Architecture Review  

## Agenda

1. System Performance Review
2. Scalability Improvements
3. Technical Debt Assessment
4. Security Updates
5. Upcoming Projects

## System Performance Review

### Current Metrics
- **API Response Time**: Average 150ms (target: <200ms) ✅
- **Database Query Time**: Average 45ms (target: <100ms) ✅
- **Memory Usage**: 65% average (target: <80%) ✅
- **CPU Usage**: 40% average (target: <70%) ✅

### Performance Issues Identified
1. **Search Service**: Complex queries taking >500ms
2. **Image Processing**: Thumbnail generation bottleneck
3. **Cache Hit Ratio**: 78% (target: >85%)

### Action Items
- [ ] Optimize search indexing algorithm
- [ ] Implement background image processing queue
- [ ] Review cache strategy for frequently accessed content

## Scalability Improvements

### Completed This Month
- ✅ Implemented horizontal scaling for API gateway
- ✅ Added read replicas for user database
- ✅ Deployed CDN for static assets

### Planned Improvements
- **Load Balancer**: Upgrade to support sticky sessions
- **Database Sharding**: Plan for user data partitioning
- **Microservices**: Split monolithic notification service

### Capacity Planning
- Current capacity: 10,000 concurrent users
- Projected growth: 50% over next 6 months
- Target capacity: 20,000 concurrent users

## Technical Debt Assessment

### High Priority Items
1. **Legacy Authentication System** (Effort: 3 weeks)
   - Replace custom auth with OAuth 2.0
   - Improve security posture
   - Enable SSO integration

2. **Database Schema Updates** (Effort: 2 weeks)
   - Normalize user preferences table
   - Add proper indexing for search queries
   - Implement soft deletes

3. **API Versioning** (Effort: 1 week)
   - Implement proper API versioning strategy
   - Deprecate old endpoints gracefully
   - Update client SDKs

### Medium Priority Items
- Refactor configuration management
- Update dependency versions
- Improve error handling consistency

### Technical Debt Metrics
- **Code Coverage**: 82% (target: >85%)
- **Cyclomatic Complexity**: Average 8 (target: <10)
- **Dependency Vulnerabilities**: 3 medium, 0 high

## Security Updates

### Completed Security Improvements
- ✅ Updated all critical dependencies
- ✅ Implemented rate limiting on authentication endpoints
- ✅ Added CSP headers to prevent XSS attacks

### Ongoing Security Initiatives
- **Security Audit**: Third-party audit scheduled for September
- **Penetration Testing**: Quarterly testing with external firm
- **Security Training**: Team training on secure coding practices

### Security Metrics
- **Vulnerability Scan Results**: 0 critical, 2 medium
- **Failed Authentication Attempts**: <0.1% of total requests
- **SSL Certificate Expiry**: All certificates valid for >30 days

## Upcoming Projects

### Q4 2024 Roadmap
1. **Real-time Collaboration** (Oct-Nov)
   - WebSocket implementation
   - Conflict resolution system
   - Live editing features

2. **Mobile API Optimization** (Nov-Dec)
   - GraphQL implementation
   - Mobile-specific endpoints
   - Offline synchronization

3. **Analytics Platform** (Dec-Jan)
   - User behavior tracking
   - Performance analytics
   - Business intelligence dashboard

### Resource Allocation
- **Development Team**: 6 engineers
- **DevOps Team**: 2 engineers
- **QA Team**: 2 engineers
- **Total Sprint Capacity**: 160 story points per month

## Decisions Made

1. **Adopt GraphQL** for mobile API optimization
2. **Implement WebSockets** for real-time features
3. **Schedule security audit** for September 15-20
4. **Approve budget** for additional Redis cluster nodes

## Action Items

| Task | Owner | Due Date | Status |
|------|-------|----------|--------|
| Optimize search indexing | Solution Architect | Sept 15 | In Progress |
| Plan database sharding | Tech Lead | Sept 30 | Not Started |
| Security audit preparation | DevOps Engineer | Sept 10 | In Progress |
| Update API documentation | Enterprise Architect | Sept 20 | Not Started |

## Next Meeting

**Date**: September 27, 2024  
**Focus**: Q4 project kickoff and security audit results`
};

/**
 * Initialize document content files in filing service
 */
async function initializeDocumentFiles(services) {
  const { filing, logger } = services;
  
  try {
    for (const [docId, content] of Object.entries(defaultDocumentContent)) {
      const filePath = `documents/${docId}.md`;
      
      try {
        // Check if file already exists
        await filing.read(filePath);
        logger.info(`Document file ${filePath} already exists, skipping`);
      } catch (error) {
        // File doesn't exist, create it
        await filing.create(filePath, content);
        logger.info(`Created document file: ${filePath}`);
      }
    }
  } catch (error) {
    logger.error('Error initializing document files:', error);
    throw error;
  }
}

module.exports = {
  defaultDocumentContent,
  initializeDocumentFiles
};