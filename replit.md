# Team Finance Tracker

## Overview

This is a full-stack web application built for team-based financial transaction management. The application allows users to create or join teams, track financial transactions, and view financial data through an intuitive dashboard interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Security**: Built-in crypto module with scrypt hashing

### Database Design
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**:
  - `teams`: Team information with invite codes
  - `users`: User accounts linked to teams with role-based access
  - `transactions`: Financial transactions with category filtering
  - Session storage table (auto-created)

## Key Components

### Authentication System
- Session-based authentication using Passport.js
- Secure password hashing with salt using Node.js crypto
- Protected routes with authentication middleware
- Role-based access (admin/member) within teams

### Team Management
- Teams can be created or joined via invite codes
- Each user belongs to one team
- Invite code system for team onboarding
- Team-scoped data isolation

### Transaction Management
- CRUD operations for financial transactions
- Category-based filtering and organization
- Date range filtering capabilities
- Team-scoped transaction visibility

### UI/UX Features
- Responsive design with mobile-first approach
- Dark/light theme support via CSS custom properties
- Toast notifications for user feedback
- Loading states and error handling
- Form validation with real-time feedback

## Data Flow

1. **Authentication Flow**: Users register/login → Session established → User data cached in React Query
2. **Team Access**: Authenticated users access team-scoped data → Transactions filtered by team ID
3. **Transaction Management**: CRUD operations → Optimistic updates → Server sync → Cache invalidation
4. **Real-time Updates**: Form submissions → API calls → Success/error handling → UI updates

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **WebSocket Support**: For Neon serverless connections

### UI & Styling
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel functionality

### Development Tools
- **TypeScript**: Type safety across full stack
- **ESBuild**: Fast bundling for production
- **Replit Integration**: Development environment optimizations

## Deployment Strategy

### Development
- Vite dev server for hot module replacement
- TSX for TypeScript execution in development
- Environment-based configuration

### Production Build
- Vite builds optimized frontend bundle to `dist/public`
- ESBuild bundles backend TypeScript to `dist/index.js`
- Single artifact deployment with static file serving

### Environment Configuration
- Database URL required for PostgreSQL connection
- Session secret for secure authentication
- NODE_ENV for environment-specific behavior

### Security Considerations
- CSRF protection through same-origin policy
- Secure session configuration with proper cookie settings
- SQL injection prevention through parameterized queries (Drizzle ORM)
- Password hashing with cryptographically secure methods