# Aviakul Finance ERP - Financial Management System

A comprehensive web-based Financial Management System built for managing multi-entity finances, bank accounts, transactions, invoices, loans, and more.

## Features

### Phase 0 (Current)

- ✅ Authentication system with JWT
- ✅ 2FA with TOTP (Google Authenticator)
- ✅ Role-Based Access Control (RBAC)
- ✅ Audit logging for all actions
- ✅ Session management with auto-logout
- ✅ Account lockout after failed login attempts
- ✅ 9 pre-seeded entities (7 companies + 2 individuals)

### Upcoming Phases

- **Phase 1**: Transactions, Bank Accounts, Import/Export
- **Phase 2**: Clients, Payables, Receivables
- **Phase 3**: Invoice Management (Tax Invoice, GST, PDF generation)
- **Phase 4**: Loan Management with Daily Interest Accrual
- **Phase 5**: Reports, Settings, Security Hardening

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React, React Router, Axios
- **Authentication**: JWT + TOTP (speakeasy)
- **Security**: bcrypt, helmet, rate limiting
- **Jobs**: node-cron (for scheduled tasks)

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## Installation

### 1. Clone and Install Dependencies

```bash
# Install all dependencies (root, server, client)
npm run install-all
```

### 2. Configure Environment Variables

#### Server Configuration

Create `server/.env` file:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/aviakul_finance_erp

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=24h

# Session
SESSION_TIMEOUT_MINUTES=30

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# Email (configure for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
EMAIL_FROM=noreply@aviakul.com

# App
APP_NAME=Aviakul Finance ERP
APP_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

#### Client Configuration

Create `client/.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_NAME=Aviakul Finance ERP
```

### 3. Start MongoDB

```bash
# If using MongoDB locally
mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Seed the Database

```bash
cd server
npm run seed
```

This will create:

- 7 company entities
- 2 individual entities
- A Super Admin user

**Default Super Admin Credentials:**

- Username: `superadmin`
- Password: `Admin@123456`
- **⚠️ CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN**

### 5. Run the Application

#### Development Mode (runs both server and client)

```bash
# From root directory
npm run dev
```

#### Or run separately

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

The application will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## First Time Setup

1. Login with default Super Admin credentials
2. Enable 2FA:
   - Go to Profile → Enable 2FA
   - Scan QR code with Google Authenticator
   - Enter verification code
3. Change your password:
   - Go to Profile → Change Password
4. Create additional users:
   - Go to Settings → User Management
   - Add users with appropriate roles

## User Roles

| Role            | Description           | Permissions                                               |
| --------------- | --------------------- | --------------------------------------------------------- |
| **Super Admin** | Full system control   | Everything, including user management and system settings |
| **Admin**       | Administrative access | Almost same as Super Admin, cannot manage other Admins    |
| **Manager**     | Approval authority    | View all, approve transactions/invoices, export reports   |
| **Employee**    | Data entry            | Limited to assigned entities, 24h edit window             |
| **Observer**    | Read-only access      | View assigned entities, export with audit trail           |

## Security Features

### Authentication

- Strong password requirements (min 8 chars, uppercase, lowercase, number, special char)
- Password hashing with bcrypt (12 rounds)
- JWT token-based authentication with 24h expiry
- 2FA with TOTP (Google Authenticator)

### Session Management

- Auto logout after 30 minutes of inactivity
- Account lockout after 5 failed login attempts (15 minute lockout)
- Session tracking with IP and user agent

### Audit Logging

- All actions logged (create, update, delete, export, login)
- Includes: user, timestamp, IP, user agent, old/new values
- Immutable audit trail

### Data Protection

- Best-effort screenshot deterrents:
  - Dynamic watermark overlays
  - Blur on tab switch/focus loss
  - Disabled right-click on sensitive views
  - ⚠️ Note: OS-level screenshot blocking is not possible in browsers

## API Documentation

### Authentication Endpoints

#### Register User

```
POST /api/auth/register
Body: { username, email, password, role, assignedEntities }
Requires: Super Admin or Admin authentication
```

#### Login

```
POST /api/auth/login
Body: { username, password, totpToken? }
Returns: { token, user, requires2FA }
```

#### Enable 2FA

```
POST /api/auth/2fa/setup
Headers: Authorization: Bearer {token}
Returns: { qrCode, secret }
```

#### Verify 2FA

```
POST /api/auth/2fa/verify
Headers: Authorization: Bearer {token}
Body: { token }
```

#### Change Password

```
POST /api/auth/change-password
Headers: Authorization: Bearer {token}
Body: { currentPassword, newPassword }
```

#### Get Current User

```
GET /api/auth/me
Headers: Authorization: Bearer {token}
Returns: { user }
```

### Entity Endpoints

#### List Entities

```
GET /api/entities
Headers: Authorization: Bearer {token}
Returns: [ { _id, name, type, pan, gstin, ... } ]
```

## Project Structure

```
aviakul-finance-erp/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context (Auth, Theme)
│   │   ├── services/      # API service layer
│   │   ├── utils/         # Helper functions
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env
├── server/                # Node.js backend
│   ├── config/           # Configuration files
│   ├── models/           # MongoDB models
│   ├── routes/           # Express routes
│   ├── middleware/       # Custom middleware
│   ├── controllers/      # Route controllers
│   ├── utils/            # Helper utilities
│   ├── jobs/             # Scheduled jobs
│   ├── seeds/            # Database seed scripts
│   ├── uploads/          # File uploads directory
│   ├── server.js         # Entry point
│   ├── package.json
│   └── .env
├── package.json          # Root package.json
├── .gitignore
└── README.md
```

## Development Guidelines

### Code Style

- Use ES6+ features
- No TypeScript (JavaScript only as per requirements)
- Follow consistent naming conventions
- Add comments for complex logic

### Git Workflow

- Create feature branches from `main`
- Use meaningful commit messages
- Test before committing

### Testing

- Unit tests for calculations (GST, TDS, interest)
- Permission tests for RBAC
- Integration tests for critical workflows

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh

# If using Docker
docker ps | grep mongodb
docker logs mongodb
```

### Port Already in Use

```bash
# Kill process on port 5000 (backend)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port 3000 (frontend)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Dependencies Issues

```bash
# Clean install
rm -rf node_modules client/node_modules server/node_modules
rm package-lock.json client/package-lock.json server/package-lock.json
npm run install-all
```

## Support

For issues or questions, contact the development team.

## License

Proprietary - Internal Use Only

---

**Current Phase**: Phase 0 - Authentication & Foundation ✅
**Next Phase**: Phase 1 - Transactions & Bank Accounts
