# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack family finance tracker built with React/TypeScript frontend and Express/Node.js backend. The application allows team-based financial transaction management with user authentication and role-based access control.

## Technology Stack

**Frontend:**
- React 18 + TypeScript + Vite
- Radix UI components with shadcn/ui
- Tailwind CSS for styling
- TanStack Query for server state management
- React Hook Form + Zod validation
- Wouter for routing

**Backend:**
- Node.js + Express + TypeScript
- Drizzle ORM + PostgreSQL (Neon serverless)
- Passport.js for authentication
- Session-based auth with PostgreSQL session store

## Development Commands

```bash
# Start development server (both frontend and backend)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check

# Database operations
npm run db:push
```

## Project Structure

```
├── client/src/           # React frontend
│   ├── components/ui/    # Reusable UI components (shadcn/ui)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and configuration
│   ├── pages/           # Route components
│   └── App.tsx          # Main app component
├── server/              # Express backend
│   ├── auth.ts          # Authentication setup
│   ├── db.ts            # Database connection
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database operations
│   └── index.ts         # Server entry point
├── shared/              # Shared types and schemas
│   └── schema.ts        # Database schema and Zod validation
└── migrations/          # Database migrations (auto-generated)
```

## Database Schema

The application uses a comprehensive set of tables with UUID-based primary keys:

**Core Tables:**
- `teams` - Team information and organization
- `users` - User accounts with role-based access (admin/member) 
- `categories` - Custom categories per team with icons and colors
- `transactions` - Financial transactions with full audit trail
- `budgets` - Budget management per category and time period

**Supporting Tables:**
- `files` - File uploads and processing status
- `rules` - Automatic categorization rules
- `notifications` - User and team notifications
- `transaction_audit_log` - Complete audit trail for transaction changes

**Key Features:**
- UUID-based relationships for better scalability
- Team-scoped data isolation
- Soft deletes with status tracking
- Automatic timestamping (created_at, updated_at)
- Default categories created automatically for new teams

All schemas are defined in `shared/schema.ts` using Drizzle ORM with Zod validation.

## Authentication Flow

1. Users register with either a team name (creates new team) or invite code (joins existing team)
2. Session-based authentication using Passport.js local strategy
3. Password hashing with Node.js crypto module (scrypt)
4. Protected routes verify authentication before accessing team data

## API Endpoints

**Authentication:**
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

**Team Management:**
- `GET /api/team` - Get team information

**Categories:**
- `GET /api/categories` - Get categories for team
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category (soft delete)

**Transactions:**
- `GET /api/transactions` - Get transactions (with filtering by categoryId, date range, status)
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction (soft delete)

**Query Parameters for Transactions:**
- `categoryId` - Filter by category UUID
- `fromDate` - Start date filter (YYYY-MM-DD)
- `toDate` - End date filter (YYYY-MM-DD)
- `status` - Filter by status (active, deleted, pending)

## Key Architecture Patterns

**Frontend State Management:**
- TanStack Query for server state caching and synchronization
- React Hook Form for form state management
- Custom hooks for authentication (`useAuth`)

**Backend Data Access:**
- Storage interface pattern (`IStorage`) for database operations
- Team-scoped data access - all operations filter by user's team
- Drizzle ORM for type-safe database queries

**Component Architecture:**
- Compound components using Radix UI primitives
- Form components with Zod validation schemas
- Responsive design with mobile-first approach

## Development Notes

- Database URL must be set in environment variables
- Session secret required for authentication
- Vite proxy handles API requests in development
- Production build outputs to `dist/` directory
- ESBuild bundles server code for production