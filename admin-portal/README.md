# Piper Admin Portal

Admin dashboard for managing schools, members, and sessions in the Piper AI Speech Therapy platform.

## Quick Start

```bash
npm install
npm run dev      # Vite frontend on :5173
npm run server   # Express API on :3001
```

## Environment Variables

Create `.env` in the root:
```
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
PORT=3001
```

## Clerk Authentication Setup

Custom JWT template is used for API authentication:

1. **Clerk Dashboard**: Create `api-auth` JWT template with claims:
   ```json
   {
     "userId": "{{user.id}}",
     "email": "{{user.primary_email_address}}"
   }
   ```

2. **Frontend** (`index.html`): Request token with template name:
   ```javascript
   const token = await Clerk.session.getToken({ template: 'api-auth' });
   ```

3. **Backend** (`server/index.js`): Verify with `@clerk/backend`:
   ```javascript
   const { verifyToken } = require('@clerk/backend');
   const claims = await verifyToken(token, {
       secretKey: process.env.CLERK_SECRET_KEY,
       authorizedParties: ['http://localhost:5173', 'http://your-domain.com']
   });
   ```

This bypasses session "pending" status issues since custom JWTs aren't session-bound.

## API Endpoints

All routes require Clerk auth except health check:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/schools` | GET | List schools |
| `/api/schools` | POST | Create school |
| `/api/schools/:id` | DELETE | Delete school |
| `/api/members` | GET | List members |
| `/api/members` | POST | Invite member |
| `/api/members/:id` | DELETE | Delete member |
| `/api/stats` | GET | Dashboard stats |

## Database

SQLite database (`server/admin.db`) with tables:
- `schools` - School organizations
- `members` - Users with roles (JSON array)
- `school_members` - Join table
