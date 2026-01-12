# Aviakul Finance ERP - Financial Management System

A comprehensive web-based Financial Management System built for managing multi-entity finances, bank accounts, transactions, invoices, loans, and more.


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


## License

Proprietary - Internal Use Only

---

