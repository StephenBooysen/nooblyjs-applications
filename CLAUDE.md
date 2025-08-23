# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant admin dashboard system built with Express.js and vanilla JavaScript. The application serves five distinct dashboard modules:

- **Server Management** (`/infrastructure`) - System monitoring for servers, databases, and storage
- **Marketing** (`/marketing`) - Email campaign management with customer segmentation  
- **Service** (`/service`) - Customer service ticket system with case management
- **Warehouse** (`/warehouse`) - Order fulfillment and inventory management
- **Delivery** (`/delivery`) - Order tracking and delivery management

Each module has its own authentication system and dedicated routes in the main server.

## Development Commands

- **Start server**: `npm start` (production mode)
- **Development**: `npm run dev` (with auto-reload via nodemon)
- **Install dependencies**: `npm install`

No build process, linting, or test commands are configured - this is a simple static file serving application.

## Architecture

### Backend Structure
- **server.js** - Main Express server with all API routes and static file serving
- **Authentication** - Session-based auth per module (no central auth system)
- **API Routes** - RESTful endpoints under `/api/[module]/` namespace
- **Static Serving** - All frontend files served from `/public/[module]/`

### Frontend Structure
Each module follows identical patterns:
```
public/[module]/
  ├── index.html     # Single-page application
  ├── css/style.css  # Module-specific styling
  └── js/app.js      # ES6 class-based application logic
```

### Frontend Architecture Pattern
All modules use a consistent class-based SPA pattern:
- ES6 classes with `init()`, `bindEvents()`, and view management methods
- Authentication state management via `/api/[module]/auth/check`
- View routing through `show[ViewName]()` methods
- Event delegation for navigation and form handling

### Authentication System
Each module has separate session management:
- Login endpoints: `POST /[module]/login`
- Auth check: `GET /api/[module]/auth/check` 
- Session storage: `req.session.[module]Authenticated`
- Default credentials: `admin/password` for all modules

### API Data
All data is hardcoded in server.js - no database integration. Each module serves mock data for demonstration purposes.

## Key Implementation Details

- **No authentication bypass** on the server management module (lines 24-29 in server.js)
- **Session configuration** uses default secret (line 13) - should be environment variable in production
- **CORS not configured** - frontend and API must be served from same origin
- **No validation** on API endpoints - accepts any POST data
- **Static file dependencies** - Inter font loaded from Google Fonts CDN

## Common Development Workflows

When adding new features to existing modules:
1. Update the appropriate API route in server.js
2. Modify the frontend class in the module's `js/app.js` 
3. Add any new HTML elements to the module's `index.html`
4. Style changes go in the module's `css/style.css`

When adding a new module:
1. Create new `/public/[module]/` directory with HTML, CSS, JS files
2. Add authentication routes in server.js following existing pattern
3. Add API routes under `/api/[module]/` namespace
4. Add static route handlers for the module's pages