# Finanzas Familiares - Implementation Tasks

This document outlines all the tasks needed to make the application fully functional, organized by feature/functionality rather than by page.

## 1. Authentication & User Management

### 1.1 User Registration
**Endpoints needed:**
- ✅ `POST /api/register` - Create new user and team OR join existing team
  - Input: name, email, password, teamName (for new team) OR inviteCode (for existing team)
  - Output: user data, team data, session

**Frontend tasks:**
- ✅ Registration form UI (register-page.tsx)
- ✅ Connect form to API endpoint
- ✅ Handle registration success/error states
- ✅ Redirect to onboarding after successful registration

**Backend tasks:**
- ✅ Validate input data (email format, password strength)
- ✅ Check if email already exists
- ✅ Hash password using crypto.scrypt
- ✅ Create new team if teamName provided
- ✅ Join existing team if inviteCode provided
- ✅ Create user record with proper team association
- ✅ Initialize session

### 1.2 User Login
**Endpoints needed:**
- ✅ `POST /api/login` - Authenticate user
  - Input: email, password
  - Output: user data, team data, session

**Frontend tasks:**
- ✅ Login form UI (login-page.tsx)
- ✅ Connect form to API endpoint
- ✅ Handle login success/error states
- ✅ Redirect to dashboard after successful login

**Backend tasks:**
- ✅ Validate credentials
- ✅ Compare password hash
- ✅ Create session
- ✅ Return user and team data

### 1.3 User Logout
**Endpoints needed:**
- ✅ `POST /api/logout` - Destroy session
  - Input: none
  - Output: success confirmation

**Frontend tasks:**
- ✅ Logout button in navigation
- ✅ Clear client-side state
- ✅ Redirect to landing page

**Backend tasks:**
- ✅ Destroy session
- ✅ Clear session cookie

### 1.4 Password Reset ⚠️ **NOT PRIORITY - SKIP FOR NOW**
**Status:** Optional feature - implement later if needed

**Endpoints needed:**
- `POST /api/forgot-password` - Send reset email
- `POST /api/reset-password` - Reset password with token

**Frontend tasks:**
- Add forgot password link functionality
- Create password reset form
- Handle reset flow

**Backend tasks:**
- Generate secure reset tokens
- Send reset emails
- Validate tokens and update passwords

**Note:** This is a nice-to-have feature that can be implemented in Phase 4 (Polish and Optimization). Core authentication is complete with registration, login, and logout.

## 2. User Profile Management

### 2.1 Profile Information
**Endpoints needed:**
- ✅ `GET /api/user` - Get current user data
- ✅ `PUT /api/user` - Update user profile
  - Input: name, email
  - Output: updated user data

**Frontend tasks:**
- ✅ Profile form UI (profile-page.tsx)
- ✅ Connect form to API endpoints
- ✅ Handle update success/error states

**Backend tasks:**
- ✅ Validate updated data
- ✅ Check email uniqueness
- ✅ Update user record
- ✅ Return updated data

### 2.2 Password Change
**Endpoints needed:**
- ✅ `PUT /api/user/password` - Change password
  - Input: currentPassword, newPassword
  - Output: success confirmation

**Frontend tasks:**
- ✅ Password change form UI (profile-page.tsx)
- ✅ Connect form to API endpoint
- ✅ Handle success/error states

**Backend tasks:**
- ✅ Verify current password
- ✅ Hash new password
- ✅ Update user record

### 2.3 Account Deletion
**Endpoints needed:**
- ✅ `DELETE /api/user` - Delete user account
  - Input: password confirmation
  - Output: success confirmation

**Frontend tasks:**
- ✅ Delete account UI (profile-page.tsx)
- ✅ Add confirmation dialog
- ✅ Handle deletion flow

**Backend tasks:**
- ✅ Verify user identity
- ✅ Soft delete user record
- ✅ Handle team membership cleanup
- ✅ Destroy session

## 3. Team Management

### 3.1 Team Information
**Endpoints needed:**
- ✅ `GET /api/team` - Get team data and members
- ✅ `PUT /api/team` - Update team information
  - Input: name
  - Output: updated team data

**Frontend tasks:**
- ✅ Team management UI (team-page.tsx)
- ✅ Connect to API endpoints
- ✅ Handle update states

**Backend tasks:**
- ✅ Validate team data
- ✅ Check admin permissions
- ✅ Update team record

### 3.2 Team Member Invitations
**Endpoints needed:**
- ✅ `POST /api/team/invite` - Send invitation email
  - Input: email
  - Output: invitation data
- ✅ `GET /api/team/invite-code` - Get/regenerate invite code
- ✅ `POST /api/team/invite-code/regenerate` - Regenerate invite code
- ✅ `POST /api/team/join` - Join team with invite code (part of registration)

**Frontend tasks:**
- ✅ Invitation form UI (team-page.tsx)
- ✅ Display invite code with copy functionality
- ✅ Handle invitation states

**Backend tasks:**
- ✅ Generate invitation codes
- ✅ Send invitation emails (placeholder implementation)
- ✅ Validate invite codes during registration
- ✅ Add users to teams

### 3.3 Member Management
**Endpoints needed:**
- ✅ `PUT /api/team/members/:id/role` - Change member role
  - Input: role (admin/member)
  - Output: updated member data
- ✅ `DELETE /api/team/members/:id` - Remove member from team

**Frontend tasks:**
- ✅ Member list UI (team-page.tsx)
- ✅ Role change functionality
- ✅ Member removal confirmation

**Backend tasks:**
- ✅ Check admin permissions
- ✅ Update member roles
- ✅ Handle member removal
- ✅ Prevent removing last admin

## 4. Categories Management

### 4.1 Category CRUD Operations
**Endpoints needed:**
- ✅ `GET /api/categories` - Get all categories for team
- ✅ `POST /api/categories` - Create new category
  - Input: name, icon, color
  - Output: created category
- ✅ `PUT /api/categories/:id` - Update category
  - Input: name, icon, color
  - Output: updated category
- ✅ `DELETE /api/categories/:id` - Soft delete category

**Frontend tasks:**
- ✅ Categories list UI (categories-page.tsx)
- ✅ Add/edit category modals
- ✅ Connect to API endpoints
- ✅ Handle CRUD operations

**Backend tasks:**
- ✅ Validate category data
- ✅ Check team ownership
- ✅ Handle soft deletes
- ✅ Prevent deleting categories with transactions

### 4.2 Default Categories Setup
**Backend tasks:**
- ✅ Create default categories for new teams
- ✅ Assign default icons and colors
- ✅ Ensure categories are team-scoped

## 5. Budget Management

### 5.1 Budget CRUD Operations
**Endpoints needed:**
- ✅ `GET /api/budgets` - Get all budgets for team
- ✅ `POST /api/budgets` - Create budget
  - Input: categoryId, amount, period
  - Output: created budget
- ✅ `PUT /api/budgets/:id` - Update budget
  - Input: amount, period
  - Output: updated budget
- ✅ `DELETE /api/budgets/:id` - Delete budget

**Frontend tasks:**
- ✅ Budget management UI (budgets-page.tsx)
- ✅ Connect to API endpoints
- ✅ Real-time budget updates
- ✅ Progress visualization

**Backend tasks:**
- ✅ Validate budget data
- ✅ Check category ownership
- ✅ Calculate budget vs spent amounts
- ✅ Handle period-based budgets

### 5.2 Budget Analytics
**Endpoints needed:**
- ✅ `GET /api/budgets/analytics` - Get budget performance data
  - Output: spending vs budget data, trends

**Frontend tasks:**
- ✅ Budget progress visualization (budgets-page.tsx, dashboard-page.tsx)
- ✅ Alert indicators for over-budget categories

**Backend tasks:**
- ✅ Calculate spending totals per category
- ✅ Compare against budget amounts
- ✅ Generate alerts for approaching limits

## 6. Transaction Management

### 6.1 Transaction CRUD Operations
**Endpoints needed:**
- ✅ `GET /api/transactions` - Get transactions with filters
  - Query params: categoryId, fromDate, toDate, status, search, page, limit
  - Output: paginated transaction list
- ✅ `POST /api/transactions` - Create transaction
  - Input: amount, description, categoryId, date
  - Output: created transaction
- ✅ `PUT /api/transactions/:id` - Update transaction
  - Input: amount, description, categoryId, date
  - Output: updated transaction
- ✅ `DELETE /api/transactions/:id` - Soft delete transaction

**Frontend tasks:**
- ✅ Transaction list UI (transactions-page.tsx)
- ✅ Add transaction form (add-transaction-page.tsx)
- ✅ Connect to API endpoints
- ✅ Implement filtering and pagination
- ✅ Edit transaction functionality

**Backend tasks:**
- ✅ Validate transaction data
- ✅ Check team/category ownership
- ✅ Handle soft deletes
- ✅ Maintain audit log
- ✅ Update budget calculations

### 6.2 Transaction Search and Filtering
**Frontend tasks:**
- ✅ Search and filter UI (transactions-page.tsx)
- ✅ Real-time search functionality
- ✅ Advanced filtering options

**Backend tasks:**
- ✅ Implement search queries
- ✅ Optimize database queries
- ✅ Add proper indexing

### 6.3 Transaction Categorization
**Endpoints needed:**
- ✅ `PUT /api/transactions/:id/categorize` - Recategorize transaction
  - Input: categoryId
  - Output: updated transaction

**Frontend tasks:**
- ✅ Recategorization UI (transactions-page.tsx)
- ✅ Bulk categorization features

**Backend tasks:**
- ✅ Update transaction categories
- ✅ Recalculate budget impacts
- ✅ Log category changes

## 7. Automated Rules System

### 7.1 Rules CRUD Operations
**Endpoints needed:**
- ✅ `GET /api/rules` - Get all rules for team
- ✅ `POST /api/rules` - Create rule
  - Input: name, field, matchText, categoryId, isActive
  - Output: created rule
- ✅ `PUT /api/rules/:id` - Update rule
  - Input: name, field, matchText, categoryId, isActive
  - Output: updated rule
- ✅ `DELETE /api/rules/:id` - Delete rule

**Frontend tasks:**
- ✅ Rules management UI (rules-page.tsx)
- ✅ Rule creation/editing forms
- ✅ Connect to API endpoints

**Backend tasks:**
- ✅ Validate rule patterns
- ✅ Check category ownership
- ✅ Store rule configurations

### 7.2 Automatic Categorization
**Endpoints needed:**
- ✅ `POST /api/transactions/categorize-batch` - Apply rules to uncategorized transactions

**Backend tasks:**
- ✅ Apply rules to new transactions
- ✅ Batch process existing transactions
- ✅ Log auto-categorization results
- ✅ Handle rule conflicts

## 8. File Upload and Processing

### 8.1 File Upload
**Endpoints needed:**
- ✅ `POST /api/files/upload` - Upload file
  - Input: file (multipart)
  - Output: file record with processing status

**Frontend tasks:**
- ✅ File upload UI (files-page.tsx, agente-page.tsx)
- ✅ Drag and drop functionality
- ✅ Upload progress indicators

**Backend tasks:**
- ✅ Handle file uploads
- ✅ Validate file types and sizes
- ✅ Store files securely
- ✅ Create file records

### 8.2 File Processing
**Endpoints needed:**
- ✅ `GET /api/files` - Get file list with status
- ✅ `GET /api/files/:id/transactions` - Get transactions from processed file
- ✅ `DELETE /api/files/:id` - Delete file and associated transactions

**Frontend tasks:**
- ✅ File status display (files-page.tsx)
- ✅ Transaction preview from files

**Backend tasks:**
- ✅ Process PDF, Excel, CSV files
- ✅ Extract transaction data
- ✅ Create transaction records
- ✅ Update file processing status
- ✅ Handle processing errors

## 9. AI Agent Integration

### 9.1 Chat Interface
**Endpoints needed:**
- ✅ `POST /api/agent/chat` - Send message to AI agent
  - Input: message, context
  - Output: AI response
- ✅ `GET /api/agent/history` - Get chat history

**Frontend tasks:**
- ✅ Chat interface UI (agente-page.tsx)
- ✅ Message history
- ✅ File upload integration

**Backend tasks:**
- ✅ Integrate with AI service
- ✅ Maintain chat context
- ✅ Handle AI responses
- ✅ Store conversation history

### 9.2 AI-Powered Features
**Endpoints needed:**
- ✅ `POST /api/agent/analyze-file` - AI analyze uploaded file
- ✅ `POST /api/agent/suggest-categories` - Get category suggestions
- ✅ `POST /api/agent/create-rules` - Generate rules from patterns

**Backend tasks:**
- ✅ Implement AI-powered file analysis
- ✅ Generate categorization suggestions
- ✅ Create automatic rules
- ✅ Provide financial insights

## 10. Notifications System

### 10.1 Notification CRUD
**Endpoints needed:**
- ✅ `GET /api/notifications` - Get user notifications
- ✅ `PUT /api/notifications/:id/read` - Mark as read
- ✅ `PUT /api/notifications/read-all` - Mark all as read
- ✅ `POST /api/notifications` - Create notification (internal)

**Frontend tasks:**
- ✅ Notifications center UI (notifications-page.tsx)
- ✅ Notification indicators in navigation
- Real-time notification updates

**Backend tasks:**
- ✅ Create notification records
- ✅ Send notifications for budget alerts
- ✅ Transaction alerts
- ✅ Team activity notifications



## 11. Dashboard and Analytics

### 11.1 Dashboard Data
**Endpoints needed:**
- `GET /api/dashboard` - Get dashboard summary data
  - Output: budget summaries, recent transactions, alerts, stats

**Frontend tasks:**
- ✅ Dashboard UI (dashboard-page.tsx)
- Real-time data updates
- Interactive charts and graphs

**Backend tasks:**
- Aggregate transaction data
- Calculate budget summaries
- Generate spending trends
- Create alert summaries

### 11.2 Financial Analytics
**Endpoints needed:**
- `GET /api/analytics/spending` - Get spending analytics
- `GET /api/analytics/trends` - Get spending trends
- `GET /api/analytics/categories` - Get category breakdowns

**Frontend tasks:**
- Charts and visualizations
- Trend analysis displays
- Category comparison views

**Backend tasks:**
- Calculate spending analytics
- Generate trend data
- Create comparative analysis
- Optimize query performance

## 12. Onboarding Flow

### 12.1 Initial Setup
**Endpoints needed:**
- `POST /api/onboarding/complete` - Complete onboarding
  - Input: selectedCategories, customCategories, budgets
  - Output: setup confirmation

**Frontend tasks:**
- ✅ Onboarding UI (onboarding-page.tsx)
- Multi-step wizard
- Category selection
- Budget setup

**Backend tasks:**
- Create selected categories
- Set initial budgets
- Mark onboarding as complete
- Redirect to dashboard

## 13. Data Export and Reporting

### 13.1 Data Export
**Endpoints needed:**
- `GET /api/export/transactions` - Export transactions to CSV/Excel
- `GET /api/export/budget-report` - Export budget report

**Frontend tasks:**
- Export buttons and options
- Format selection
- Date range selection

**Backend tasks:**
- Generate CSV/Excel files
- Create formatted reports
- Handle large datasets

## 14. Security and Performance

### 14.1 Security Implementation
**Backend tasks:**
- Input validation and sanitization
- Rate limiting
- CSRF protection
- SQL injection prevention
- File upload security
- Session security

### 14.2 Performance Optimization
**Backend tasks:**
- Database indexing
- Query optimization
- Caching implementation
- File compression
- API response optimization

**Frontend tasks:**
- Code splitting
- Lazy loading
- Image optimization
- Bundle optimization

## 15. Testing and Quality Assurance

### 15.1 Backend Testing
**Tasks:**
- Unit tests for all endpoints
- Integration tests for workflows
- Security testing
- Performance testing

### 15.2 Frontend Testing
**Tasks:**
- Component testing
- Integration testing
- E2E testing
- Cross-browser testing

## Implementation Priority

### Phase 1 (Core Features)
1. Authentication & User Management (1.1-1.3)
2. Team Management (3.1-3.2)
3. Categories Management (4.1-4.2)
4. Transaction Management (6.1-6.2)
5. Dashboard (11.1)

### Phase 2 (Enhanced Features)
1. Budget Management (5.1-5.2)
2. User Profile Management (2.1-2.3)
3. Notifications System (10.1)
4. Onboarding Flow (12.1)

### Phase 3 (Advanced Features)
1. Automated Rules System (7.1-7.2)
2. File Upload and Processing (8.1-8.2)
3. AI Agent Integration (9.1-9.2)
4. Analytics and Reporting (11.2, 13.1)

### Phase 4 (Polish and Optimization)
1. Real-time features (10.2)
2. Security hardening (14.1)
3. Performance optimization (14.2)
4. Comprehensive testing (15.1-15.2)

## Notes

- All endpoints should include proper authentication middleware
- All data operations should be team-scoped for security
- Error handling should be comprehensive with user-friendly messages
- All forms should include proper validation
- Database operations should use transactions where appropriate
- File uploads should be virus-scanned and size-limited
- All user inputs should be sanitized and validated
- API responses should be consistent in format
- Logging should be implemented for debugging and monitoring


# Other tasks:
- Beign able to upload a profile picture on the /profile page
- Implement email sending in /api/team/invite endpoint for
  email invitations (currently a placeholder implementation)
  ## Real-time Notifications
**Backend tasks:**
- Implement WebSocket or Server-Sent Events
- Push notifications for real-time updates
- Budget threshold alerts
- Transaction processing completion