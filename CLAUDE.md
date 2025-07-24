# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive full-stack family finance tracker built with React/TypeScript frontend and Express/Node.js backend. The application provides team-based financial transaction management with advanced features including AI agent assistance, file processing, budget tracking, and comprehensive analytics.

## Technology Stack

**Frontend:**
- React 18 + TypeScript + Vite
- Radix UI components with shadcn/ui
- Tailwind CSS for styling
- TanStack Query for server state management
- React Hook Form + Zod validation
- Wouter for routing
- Recharts for data visualization
- Framer Motion for animations

**Backend:**
- Node.js + Express + TypeScript
- Drizzle ORM + PostgreSQL (Neon serverless)
- Passport.js for authentication
- Session-based auth with connect-pg-simple
- OpenAI Agents for AI assistance
- Multer for file uploads
- PDF parsing and Excel/CSV processing

**Key Dependencies:**
- File Processing: pdf-parse, xlsx, csv-parser
- AI Integration: @openai/agents
- Database: @neondatabase/serverless, drizzle-orm
- UI Components: Extensive Radix UI component library
- Authentication: passport, passport-local, express-session

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
│   ├── components/
│   │   ├── ui/          # Extensive shadcn/ui component library
│   │   └── navigation.tsx # Main navigation component
│   ├── hooks/           # Custom React hooks (auth, mobile, toast)
│   ├── lib/             # Utilities and configuration
│   ├── pages/           # Comprehensive page components
│   │   ├── auth-page.tsx
│   │   ├── dashboard-page.tsx
│   │   ├── transactions-page.tsx
│   │   ├── categories-page.tsx
│   │   ├── budgets-page.tsx
│   │   ├── files-page.tsx
│   │   ├── agente-page.tsx # AI agent interface
│   │   ├── notifications-page.tsx
│   │   ├── team-page.tsx
│   │   ├── rules-page.tsx
│   │   └── onboarding-page.tsx
│   └── App.tsx          # Main app component
├── server/              # Express backend
│   ├── auth.ts          # Authentication setup
│   ├── db.ts            # Database connection
│   ├── routes.ts        # Comprehensive API routes
│   ├── storage.ts       # Database operations
│   ├── agent.ts         # AI agent implementation
│   ├── seed-data.ts     # Database seeding
│   └── index.ts         # Server entry point
├── shared/              # Shared types and schemas
│   └── schema.ts        # Complete database schema and Zod validation
└── uploads/             # File upload directory
```

## Database Schema

The application uses a comprehensive set of tables with UUID-based primary keys:

**Core Tables:**
- `teams` - Team information and organization
- `users` - User accounts with role-based access (admin/member) 
- `categories` - Custom categories per team with icons and colors
- `transactions` - Financial transactions with full audit trail
- `budgets` - Budget management per category and time period

**Advanced Tables:**
- `files` - File uploads with processing status and metadata
- `rules` - Automatic categorization rules with field matching
- `notifications` - User and team notifications with read status
- `transaction_audit_log` - Complete audit trail for all transaction changes
- `conversations` - AI agent conversation history with context

**Enhanced Features:**
- AI-suggested categorizations with confidence scores
- File-based transaction imports (PDF, Excel, CSV)
- Comprehensive audit logging for all changes
- Flexible budget periods (monthly, weekly, biweekly, custom)
- Team-scoped data isolation with role-based permissions

All schemas are defined in `shared/schema.ts` using Drizzle ORM with Zod validation.

## Authentication Flow

1. Users register with either a team name (creates new team) or invite code (joins existing team)
2. Session-based authentication using Passport.js local strategy
3. Password hashing with Node.js crypto module (scrypt)
4. Protected routes verify authentication before accessing team data

## API Endpoints

**Authentication:**
- `POST /api/register` - User registration with team creation/joining
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

**Team Management:**
- `GET /api/team` - Get team information and members
- `PUT /api/team` - Update team information (admin only)
- `GET /api/team/invite-code` - Get team invite code (admin only)
- `POST /api/team/invite-code/regenerate` - Regenerate invite code (admin only)
- `POST /api/team/invite` - Send team invitation (admin only)
- `PUT /api/team/members/:id/role` - Change member role (admin only)
- `DELETE /api/team/members/:id` - Remove team member (admin only)

**Transactions:**
- `GET /api/transactions` - Get transactions with advanced filtering
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction with audit logging
- `DELETE /api/transactions/:id` - Soft delete transaction
- `PUT /api/transactions/:id/categorize` - Recategorize transaction
- `POST /api/transactions/categorize-batch` - Apply rules to transactions

**Categories:**
- `GET /api/categories` - Get categories for team
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category (with transaction check)

**Budgets:**
- `GET /api/budgets` - Get budgets for team
- `POST /api/budgets` - Create new budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget
- `GET /api/budgets/analytics` - Get budget analytics and spending data

**Rules:**
- `GET /api/rules` - Get categorization rules
- `POST /api/rules` - Create new rule
- `PUT /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule

**File Processing:**
- `POST /api/files/upload` - Upload financial files (PDF, Excel, CSV)
- `GET /api/files` - Get uploaded files with processing status
- `GET /api/files/:id/transactions` - Get transactions from processed file
- `DELETE /api/files/:id` - Delete file and associated data

**Notifications:**
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `POST /api/notifications` - Create new notification

**AI Agent:**
- `POST /api/agent/chat` - Chat with AI financial assistant
- `GET /api/agent/history` - Get conversation history
- `POST /api/agent/analyze-file` - AI analysis of uploaded files
- `POST /api/agent/suggest-categories` - AI category suggestions
- `POST /api/agent/create-rules` - AI-generated categorization rules

**Analytics & Dashboard:**
- `GET /api/dashboard` - Comprehensive dashboard data
- `GET /api/analytics/spending` - Spending analytics by period
- `GET /api/analytics/trends` - Spending trends over time
- `GET /api/analytics/categories` - Category breakdown analytics

**Onboarding:**
- `POST /api/onboarding/complete` - Complete initial setup

**Query Parameters:**
- Transactions support: `categoryId`, `fromDate`, `toDate`, `status`, `search`, `page`, `limit`
- Analytics support: `period`, `months` for time-based filtering

## Key Architecture Patterns

**Frontend State Management:**
- TanStack Query for comprehensive server state management
- React Hook Form for form state and validation
- Custom hooks for authentication, mobile detection, and toast notifications

**Backend Data Access:**
- Storage interface pattern for type-safe database operations
- Team-scoped data access with automatic filtering
- Comprehensive audit logging for all data changes
- Drizzle ORM with full TypeScript integration

**AI Integration:**
- OpenAI Agents for intelligent financial assistance
- File content analysis and transaction extraction
- Automatic categorization suggestions with confidence scoring
- Rule generation based on transaction patterns

**File Processing:**
- Multi-format support (PDF, Excel, CSV)
- Asynchronous processing with status tracking
- Intelligent transaction parsing with multiple format recognition
- Error handling and progress reporting

**Component Architecture:**
- Extensive shadcn/ui component library
- Responsive design with mobile-first approach
- Form components with comprehensive Zod validation
- Data visualization with Recharts integration

## Development Notes

- Database URL must be set in environment variables
- Session secret required for authentication
- OpenAI API key required for AI agent functionality
- File uploads stored in `uploads/` directory
- Vite proxy handles API requests in development
- Production build outputs to `dist/` directory
- ESBuild bundles server code for production
- Comprehensive error handling and logging throughout
- Team-based data isolation ensures security and privacy