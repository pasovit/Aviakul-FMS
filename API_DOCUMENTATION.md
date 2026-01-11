# API Documentation - Aviakul Finance ERP (Phase 0)

Base URL: `http://localhost:5000/api`

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Optional error details"
}
```

## Authentication Endpoints

### 1. Login

**POST** `/auth/login`

Login with username and password. Returns JWT token.

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Admin@123456",
  "totpToken": "123456" // Optional, required if 2FA enabled
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64abc123...",
      "username": "superadmin",
      "email": "admin@aviakul.com",
      "role": "super_admin",
      "fullName": "Super Admin",
      "twoFactorEnabled": false,
      "assignedEntities": [...]
    }
  }
}
```

**OR if 2FA required:**

```json
{
  "success": true,
  "requires2FA": true,
  "message": "2FA verification required"
}
```

**Rate Limit:** 20 requests per 15 minutes per IP

---

### 2. Register User

**POST** `/auth/register`

Create a new user. Requires Super Admin or Admin authentication.

**Authentication:** Required (Super Admin or Admin)

**Request Body:**

```json
{
  "username": "john.doe",
  "email": "john@example.com",
  "password": "SecurePass@123",
  "role": "employee", // super_admin, admin, manager, employee, observer
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9876543210",
  "assignedEntities": ["64abc123...", "64abc456..."]
}
```

**Validation Rules:**

- Username: 3-50 chars, lowercase, unique
- Email: Valid email format, unique
- Password: Min 8 chars, must contain uppercase, lowercase, number, special char
- Role: One of the 5 defined roles
- Admins cannot create Super Admin or other Admin users

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "64abc789...",
      "username": "john.doe",
      "email": "john@example.com",
      "role": "employee",
      "fullName": "John Doe"
    }
  }
}
```

---

### 3. Logout

**POST** `/auth/logout`

Logout current user and invalidate session.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 4. Get Current User

**GET** `/auth/me`

Get current authenticated user's information.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64abc123...",
      "username": "superadmin",
      "email": "admin@aviakul.com",
      "role": "super_admin",
      "fullName": "Super Admin",
      "phone": "9999999999",
      "twoFactorEnabled": false,
      "assignedEntities": [
        {
          "_id": "64def123...",
          "name": "Aviakul Private Limited",
          "type": "company"
        },
        ...
      ],
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 5. Change Password

**POST** `/auth/change-password`

Change current user's password.

**Authentication:** Required

**Request Body:**

```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456"
}
```

**Validation:**

- Current password must be correct
- New password must meet strength requirements
- Invalidates all other sessions

**Response:**

```json
{
  "success": true,
  "message": "Password changed successfully. Other sessions have been logged out."
}
```

---

### 6. Setup 2FA

**POST** `/auth/2fa/setup`

Initialize 2FA setup. Returns QR code and secret.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "message": "2FA setup initiated. Scan QR code with Google Authenticator.",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...",
    "secret": "JBSWY3DPEHPK3PXP"
  }
}
```

**Usage:**

1. User scans QR code with Google Authenticator
2. User verifies with code from app (next endpoint)

---

### 7. Verify 2FA

**POST** `/auth/2fa/verify`

Verify 2FA code and enable 2FA.

**Authentication:** Required

**Request Body:**

```json
{
  "token": "123456" // 6-digit code from Google Authenticator
}
```

**Response:**

```json
{
  "success": true,
  "message": "2FA enabled successfully"
}
```

---

### 8. Disable 2FA

**POST** `/auth/2fa/disable`

Disable 2FA. Requires password and current 2FA code.

**Authentication:** Required

**Request Body:**

```json
{
  "password": "CurrentPass@123",
  "token": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

---

## Entity Endpoints

### 1. List Entities

**GET** `/entities`

Get list of entities with pagination and filters.

**Authentication:** Required

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `type` (string) - Filter by type: company, individual, ngo, llp, partnership
- `search` (string) - Search by name
- `isActive` (boolean) - Filter active/inactive

**Access Control:**

- Super Admin / Admin: See all entities
- Others: See only assigned entities

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64abc123...",
      "name": "Aviakul Private Limited",
      "type": "company",
      "businessType": "private_limited",
      "pan": "AAAAA0000A",
      "gstin": "29AAAAA0000A1Z5",
      "email": "contact@aviakul.com",
      "phone": "9876543210",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    ...
  ],
  "pagination": {
    "total": 9,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 2. Get Entity by ID

**GET** `/entities/:id`

Get detailed information about a specific entity.

**Authentication:** Required

**Access Control:**

- Super Admin / Admin: Access all
- Others: Access only assigned entities

**Response:**

```json
{
  "success": true,
  "data": {
    "entity": {
      "_id": "64abc123...",
      "name": "Aviakul Private Limited",
      "type": "company",
      "businessType": "private_limited",
      "pan": "AAAAA0000A",
      "gstin": "29AAAAA0000A1Z5",
      "address": {
        "line1": "123 Business Park",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560001",
        "country": "India"
      },
      "email": "contact@aviakul.com",
      "phone": "9876543210",
      "industry": "Technology",
      "isActive": true,
      "financialYearStart": 4,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 3. Create Entity

**POST** `/entities`

Create a new entity.

**Authentication:** Required (Super Admin or Admin only)

**Request Body:**

```json
{
  "name": "New Company Pvt Ltd",
  "type": "company",
  "businessType": "private_limited",
  "pan": "JJJJJ9999J",
  "gstin": "29JJJJJ9999J1Z5",
  "address": {
    "line1": "123 Street",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "country": "India"
  },
  "email": "contact@newcompany.com",
  "phone": "9876543210",
  "industry": "Technology",
  "isActive": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Entity created successfully",
  "data": {
    "entity": { ... }
  }
}
```

---

### 4. Update Entity

**PUT** `/entities/:id`

Update an existing entity.

**Authentication:** Required (Super Admin or Admin only)

**Request Body:** (partial update supported)

```json
{
  "email": "newemail@aviakul.com",
  "phone": "9999999999",
  "isActive": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Entity updated successfully",
  "data": {
    "entity": { ... }
  }
}
```

---

### 5. Delete Entity

**DELETE** `/entities/:id`

Delete an entity.

**Authentication:** Required (Super Admin only)

**Response:**

```json
{
  "success": true,
  "message": "Entity deleted successfully"
}
```

---

## Audit Log Endpoints

### 1. Get Audit Logs

**GET** `/audit`

Get audit logs with pagination and filters.

**Authentication:** Required (Super Admin, Admin, or Manager)

**Query Parameters:**

- `page` (number) - Page number
- `limit` (number) - Items per page
- `action` (string) - Filter by action type
- `resource` (string) - Filter by resource type
- `userId` (string) - Filter by user
- `startDate` (string, ISO date) - Filter from date
- `endDate` (string, ISO date) - Filter to date

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64abc123...",
      "user": {
        "_id": "64def456...",
        "username": "superadmin",
        "email": "admin@aviakul.com"
      },
      "userName": "superadmin",
      "action": "login",
      "resource": "auth",
      "description": "Successful login",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "status": "success",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    ...
  ],
  "pagination": { ... }
}
```

**Action Types:**

- create, update, delete, view, export
- login, logout, login_failed, password_change
- 2fa_enabled, 2fa_disabled, 2fa_verified
- approve, reject, send, cancel
- import, bulk_update, bulk_delete

**Resource Types:**

- user, entity, bank_account, transaction, client
- invoice, loan, payment, report, settings, auth

---

### 2. Get Audit Log by ID

**GET** `/audit/:id`

Get detailed audit log entry.

**Authentication:** Required (Super Admin, Admin, or Manager)

**Response:**

```json
{
  "success": true,
  "data": {
    "log": {
      "_id": "64abc123...",
      "user": { ... },
      "action": "update",
      "resource": "entity",
      "resourceId": "64def789...",
      "changes": {
        "before": { "email": "old@example.com" },
        "after": { "email": "new@example.com" }
      },
      "description": "Updated entity email",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "status": "success",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## Error Codes

| Status Code | Meaning                                       |
| ----------- | --------------------------------------------- |
| 200         | Success                                       |
| 201         | Created                                       |
| 400         | Bad Request (validation error)                |
| 401         | Unauthorized (not logged in or invalid token) |
| 403         | Forbidden (insufficient permissions)          |
| 404         | Not Found                                     |
| 429         | Too Many Requests (rate limit exceeded)       |
| 500         | Internal Server Error                         |

## Common Error Responses

### Validation Error (400)

```json
{
  "success": false,
  "message": "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
}
```

### Authentication Error (401)

```json
{
  "success": false,
  "message": "Not authorized to access this route. Please login."
}
```

### Permission Error (403)

```json
{
  "success": false,
  "message": "Role 'employee' is not authorized to access this resource"
}
```

### Rate Limit Error (429)

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Testing with cURL

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"Admin@123456"}'
```

### Get Current User (with token)

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### List Entities

```bash
curl -X GET http://localhost:5000/api/entities \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Testing with Postman

1. **Create Environment:**

   - Variable: `baseUrl` = `http://localhost:5000/api`
   - Variable: `token` = (leave empty, will be set after login)

2. **Login Request:**

   - POST `{{baseUrl}}/auth/login`
   - Body: JSON with username and password
   - In Tests tab, add: `pm.environment.set("token", pm.response.json().data.token);`

3. **Protected Requests:**
   - Add header: `Authorization: Bearer {{token}}`

---

## Rate Limits

| Endpoint         | Limit                     |
| ---------------- | ------------------------- |
| General API      | 100 requests / 15 minutes |
| `/auth/login`    | 20 requests / 15 minutes  |
| `/auth/register` | 20 requests / 15 minutes  |

Rate limits are per IP address.

---

## Security Notes

1. **JWT Tokens:**

   - Expire after 24 hours
   - Stored in localStorage on client
   - Automatically included in requests via Axios interceptor

2. **Sessions:**

   - Tracked in database
   - Auto-logout after 30 minutes inactivity
   - Cleared on password change (except current session)

3. **Account Lockout:**

   - Triggered after 5 failed login attempts
   - 15-minute lockout duration
   - Cleared on successful login

4. **Audit Logging:**
   - All actions logged automatically
   - Logs are immutable (cannot be modified or deleted)
   - Includes IP, user agent, timestamp, and action details

---

For more information, see [README.md](README.md) and [PHASE_0_COMPLETION.md](PHASE_0_COMPLETION.md).
