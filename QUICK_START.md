# 🚀 Quick Start Guide - Aviakul Finance ERP

## One-Command Setup (Windows)

```powershell
.\setup.ps1
```

## One-Command Setup (Linux/Mac)

```bash
chmod +x setup.sh
./setup.sh
```

## Manual Setup (5 Steps)

### Step 1: Install Dependencies

```bash
npm run install-all
```

### Step 2: Setup Environment

Copy the example files and configure:

```bash
# Windows
copy server\.env.example server\.env
copy client\.env.example client\.env

# Linux/Mac
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**Important**: Edit `server/.env` and set a strong `JWT_SECRET` (minimum 32 characters)

### Step 3: Start MongoDB

```bash
# If installed locally
mongod

# OR with Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 4: Seed Database

```bash
cd server
npm run seed
cd ..
```

This creates:

- 9 entities (7 companies + 2 individuals)
- 1 super admin user

### Step 5: Run Application

```bash
npm run dev
```

This starts both:

- Backend API: http://localhost:5000
- Frontend App: http://localhost:3000

## Login

Open http://localhost:3000 and login with:

```
Username: superadmin
Password: Admin@123456
```

**⚠️ IMPORTANT: Change this password immediately after first login!**

## What to Do Next

1. **Change Password**

   - Go to Profile → Change Password
   - Use a strong password

2. **Enable 2FA** (Recommended)

   - Go to Profile → Two-Factor Auth
   - Scan QR code with Google Authenticator
   - Enter verification code

3. **Explore Features**

   - View dashboard
   - Check entities list
   - Review audit logs (if Manager+ role)

4. **Create Users** (Super Admin only)
   - API: POST /api/auth/register
   - Assign roles and entities

## Troubleshooting

### MongoDB Connection Error

```bash
# Check if MongoDB is running
mongosh

# If not running, start it
mongod
```

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Dependencies Error

```bash
# Clean install
rm -rf node_modules client/node_modules server/node_modules
rm package-lock.json client/package-lock.json server/package-lock.json
npm run install-all
```

## Need Help?

- See [README.md](README.md) for complete documentation
- See [PHASE_0_COMPLETION.md](PHASE_0_COMPLETION.md) for detailed features
- Check server logs: `server/logs/combined.log`

## Quick Reference

### Available Scripts

```bash
# Root directory
npm run dev          # Run both server and client
npm run server       # Run only server
npm run client       # Run only client
npm run install-all  # Install all dependencies

# Server directory
npm run dev          # Run with nodemon (auto-restart)
npm start            # Run normally
npm run seed         # Seed database

# Client directory
npm start            # Run development server
npm run build        # Build for production
```

### Default Ports

- Frontend: 3000
- Backend: 5000
- MongoDB: 27017

### User Roles

1. **Super Admin** - Full access
2. **Admin** - Cannot manage other admins
3. **Manager** - Approval & reports
4. **Employee** - Limited access, 24h edit
5. **Observer** - Read-only

---

**Ready to go! 🎉**

For Phase 1 (Transactions & Bank Accounts), check back soon!
