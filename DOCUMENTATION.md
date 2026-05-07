# nEWS (TimesSea) — Project Documentation

## Overview

Full-stack news publishing platform. Users write articles, admins review them, and everyone can read, like, comment, and follow authors.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS 4, Radix UI, Framer Motion |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | Google OAuth 2.0 + JWT (access + refresh tokens) |
| Analytics | ClickHouse (event storage) + BullMQ (queue) |
| Cache / Queue | Redis 7 (via BullMQ) |
| Real-time | Socket.io (WebSockets) |
| PWA | @ducanh2912/next-pwa |
| Docker | Redis + ClickHouse via Docker Compose |

---

## Project Structure

```
nEWS/
├── Backend/          # NestJS API server
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── modules/       # Feature modules
│   │   ├── middlewares/   # Auth strategies (JWT, Google)
│   │   ├── gateways/      # WebSocket gateways
│   │   └── generated/     # Prisma client (auto-generated)
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── scripts/           # Admin promotion scripts
│   ├── clickhouse-init/   # ClickHouse SQL init files
│   ├── docker-compose.yml
│   └── .env
└── Frontend/         # Next.js app
    ├── app/          # Pages (App Router)
    ├── components/   # Reusable UI components
    ├── contexts/     # React context providers
    ├── hooks/        # Custom hooks
    ├── lib/          # Utility functions
    └── .env.local
```

---

## Environment Variables

### Backend (`Backend/.env`)

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/News_Backend"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/auth/google/callback"
JWT_SECRET="your-jwt-secret"
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`Frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Database Schema (Prisma)

### User Roles
```
USER → EDITOR → ADMIN → SUPERADMIN
```

### Models
- **User** — id, email, name, picture, handle, role, banned, warnings
- **Article** — title, content, category, status, published, scheduledAt, factChecked, seoTitle
- **ArticleReview** — articleId, reviewerId, status (Approved/Rejected/NeedsCorrection), feedback
- **Comment** — content, articleId, authorId, parentId (nested replies)
- **CommentLike / ArticleLike** — toggle likes
- **Bookmark** — saved articles per user
- **Notification** — type, title, message, read, actorId
- **Follow** — followerId → followingId
- **TopicFollow** — userId follows a category/topic
- **RefreshToken** — token, userId, expiresAt

---

## API Endpoints

### Auth — `/auth`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | OAuth callback, sets cookie + redirects |
| GET | `/auth/profile` | Get current user (JWT required) |
| POST | `/auth/refresh` | Refresh access token using httpOnly cookie |
| POST | `/auth/logout` | Clear refresh token cookie |

### Articles — `/api/articles`
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/articles` | Optional | List published articles |
| GET | `/api/articles/:id` | Optional | Get single article |
| GET | `/api/articles/trending/all` | — | Trending articles |
| GET | `/api/articles/drafts` | JWT | Current user's drafts |
| GET | `/api/articles/user/published` | JWT | Current user's published |
| GET | `/api/articles/user/bookmarks` | JWT | Current user's bookmarks |
| POST | `/api/articles` | — | Create article |
| PUT | `/api/articles/:id` | — | Update article |
| DELETE | `/api/articles/:id` | JWT | Delete own article |
| POST | `/api/articles/:id/like` | JWT | Toggle like |
| POST | `/api/articles/:id/bookmark` | JWT | Toggle bookmark |
| POST | `/api/articles/:id/view` | — | Increment view count |
| POST | `/api/articles/:id/read` | — | Increment read count |
| PATCH | `/api/articles/:id/submit-review` | JWT | Submit article for review |
| POST | `/api/articles/:id/review` | ADMIN+ | Approve/Reject/NeedsCorrection |
| GET | `/api/articles/admin/pending` | ADMIN+ | Pending review queue |
| GET | `/api/articles/admin/stats` | ADMIN+ | Dashboard stats |
| GET | `/api/articles/admin/rejected` | ADMIN+ | Rejected articles |
| GET | `/api/articles/admin/published` | SUPERADMIN | All published articles |
| DELETE | `/api/articles/admin/:id` | SUPERADMIN | Force-delete any article |

### Comments — `/api/comments`
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/comments` | JWT | Create comment/reply |
| GET | `/api/comments/article/:articleId` | Optional | Get article comments |
| GET | `/api/comments/article/:articleId/count` | — | Comment count |
| POST | `/api/comments/:id/like` | JWT | Toggle comment like |
| DELETE | `/api/comments/:id` | JWT | Delete own comment |

### Notifications — `/api/notifications`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/notifications` | Get all notifications |
| GET | `/api/notifications/unread-count` | Unread count |
| POST | `/api/notifications/:id/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### Users — `/users`
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/users/search?q=` | — | Search users |
| GET | `/users/:id/profile` | — | Get user profile |
| POST | `/users/profile/update` | JWT | Update own profile |
| POST | `/users/:id/follow` | JWT | Toggle follow |
| GET | `/users/:id/follow-status` | JWT | Check follow status |
| GET | `/users/:id/followers` | — | Get followers |
| GET | `/users/:id/following` | — | Get following |
| POST | `/users/topics/follow` | JWT | Toggle topic follow |
| GET | `/users/topics/followed` | JWT | Get followed topics |
| GET | `/users/admin/all` | SUPERADMIN | List all users |
| PATCH | `/users/:id/role` | SUPERADMIN | Change user role |
| PATCH | `/users/:id/ban` | SUPERADMIN | Toggle ban |
| PATCH | `/users/:id/warn` | SUPERADMIN | Warn user |

### Analytics — `/analytics`
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/analytics/track` | — | Track single event |
| POST | `/analytics/track/batch` | — | Track multiple events |
| GET | `/analytics/dashboard?days=7` | JWT | Author dashboard stats |
| GET | `/analytics/profile/overview` | JWT | Author overview stats |
| GET | `/analytics/profile/activity` | JWT | Likes/comments count |
| GET | `/analytics/profile/likes` | JWT | Liked articles |
| GET | `/analytics/profile/comments` | JWT | Commented articles |
| GET | `/analytics/profile/history` | JWT | Reading history |
| GET | `/analytics/post/:postId` | — | Post analytics |
| GET | `/analytics/post/:postId/geo` | — | Geo distribution |
| GET | `/analytics/post/:postId/trend` | — | Post trend |
| GET | `/analytics/trending?limit=20` | — | Trending posts |
| GET | `/analytics/platform` | — | Platform-wide stats |
| GET | `/analytics/moderation?days=7` | — | Moderation analytics |
| GET | `/analytics/queue/health` | — | BullMQ queue metrics |

---

## Analytics Events (ClickHouse)

Events tracked: `post_view`, `post_read`, `post_created`, `post_approved`, `post_rejected`, `like`, `unlike`, `comment`, `share`, `save`, `user_login`, `user_signup`, `follow`, `search_query`, `moderation_review`

**Event payload:**
```json
{
  "event": "post_view",
  "user_id": "uuid",
  "post_id": "uuid",
  "device": "mobile|web|tablet",
  "duration": 120,
  "metadata": {}
}
```

---

## Docker Setup (Analytics Infrastructure)

Redis and ClickHouse run in Docker. PostgreSQL runs locally.

### Container Names
- `timessea_redis` — Redis 7 on port `6379`
- `timessea_clickhouse` — ClickHouse 24.1 on ports `8123` (HTTP) and `9000` (Native)

### PowerShell Commands

```powershell
# Navigate to Backend folder first
cd C:\Sitarahub\nEWS\Backend

# Start Redis + ClickHouse
docker compose up -d

# Or use the helper script
.\start-analytics.ps1

# Stop services
docker compose down

# View logs
docker compose logs -f

# Check specific service logs
docker compose logs -f redis
docker compose logs -f clickhouse

# Check running containers
docker ps --filter "name=timessea"

# Redis CLI
docker exec -it timessea_redis redis-cli

# ClickHouse CLI
docker exec -it timessea_clickhouse clickhouse-client

# Check ClickHouse HTTP
Invoke-WebRequest -Uri "http://localhost:8123" -UseBasicParsing
```

---

## Running the Project

### Prerequisites
- Node.js 20+
- PostgreSQL running locally
- Docker Desktop (for Redis + ClickHouse)

### Step 1 — Start Docker Services
```powershell
cd C:\Sitarahub\nEWS\Backend
.\start-analytics.ps1
```

### Step 2 — Start Backend
```powershell
cd C:\Sitarahub\nEWS\Backend
npm run dev
# Runs on http://localhost:5000
```

### Step 3 — Start Frontend
```powershell
cd C:\Sitarahub\nEWS\Frontend
npm run dev
# Runs on http://localhost:3000
```

### Run Both Together
```powershell
cd C:\Sitarahub\nEWS\Frontend
npm run dev:all
```

---

## Prisma Commands

```powershell
cd C:\Sitarahub\nEWS\Backend

# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database (dev)
npx prisma db push

# Run migrations
npx prisma migrate dev --name <migration-name>

# Open Prisma Studio (DB GUI)
npx prisma studio

# Seed database
npx prisma db seed
```

---

## Creating Admin / SuperAdmin

Users must **log in at least once** via Google OAuth before being promoted.

### Method 1 — promote-user.ts (any role)
```powershell
cd C:\Sitarahub\nEWS\Backend

# Promote to ADMIN
npx tsx promote-user.ts user@example.com ADMIN

# Promote to SUPERADMIN
npx tsx promote-user.ts user@example.com SUPERADMIN

# Promote to EDITOR
npx tsx promote-user.ts user@example.com EDITOR

# Demote back to USER
npx tsx promote-user.ts user@example.com USER
```

### Method 2 — promote-superadmin.ts (dedicated script)
```powershell
cd C:\Sitarahub\nEWS\Backend
npx ts-node scripts/promote-superadmin.ts admin@example.com
```

### Method 3 — Via API (SUPERADMIN JWT required)
```powershell
# Change role via API
$headers = @{ Authorization = "Bearer YOUR_JWT_TOKEN" }
$body = '{"role":"ADMIN"}' | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5000/users/USER_ID/role" `
  -Method PATCH `
  -Headers $headers `
  -Body '{"role":"ADMIN"}' `
  -ContentType "application/json"
```

> **Note:** After promotion, the user must **log out and log back in** for the new role to take effect.

---

## Role Permissions

| Action | USER | EDITOR | ADMIN | SUPERADMIN |
|--------|------|--------|-------|-----------|
| Read articles | ✅ | ✅ | ✅ | ✅ |
| Write/draft articles | ✅ | ✅ | ✅ | ✅ |
| Submit for review | ✅ | ✅ | ✅ | ✅ |
| Review (approve/reject) | ❌ | ❌ | ✅ | ✅ |
| View pending queue | ❌ | ❌ | ✅ | ✅ |
| View all published (admin) | ❌ | ❌ | ❌ | ✅ |
| Force-delete any article | ❌ | ❌ | ❌ | ✅ |
| Manage users (ban/warn/role) | ❌ | ❌ | ❌ | ✅ |

---

## Article Lifecycle

```
Draft → [Submit for Review] → Pending → [Admin Reviews] → Approved (Published)
                                                        → Rejected
                                                        → NeedsCorrection → (author edits) → Pending
```

---

## Auth Flow

1. User visits `/auth/google` → redirected to Google
2. Google calls back `/auth/google/callback`
3. Backend creates/finds user in DB, generates JWT access token + refresh token
4. Refresh token stored in DB + set as `httpOnly` cookie
5. Access token passed in URL → frontend stores in memory
6. Frontend sends `Authorization: Bearer <token>` on every request
7. When access token expires → POST `/auth/refresh` → new access token from cookie

---

## WebSocket Events

Server: `http://localhost:5000` (Socket.io)

- **`articleUpdate`** — Fires when an article is updated (views, likes, etc.)

---

## npm Scripts Reference

### Backend
```powershell
npm run dev              # Start with hot-reload
npm run build            # Compile TypeScript
npm run start:prod       # Run compiled build
npm run analytics:start  # Start Docker services (alias for .\start-analytics.ps1)
npm run analytics:stop   # Stop Docker services
npm run analytics:logs   # Tail Docker logs
npm run clickhouse:cli   # Open ClickHouse CLI
npm run redis:cli        # Open Redis CLI
npm run lint             # Run ESLint
npm run test             # Run Jest tests
```

### Frontend
```powershell
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run dev:all  # Start frontend + backend together
```

---

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Home feed |
| `/explore` | Explore articles |
| `/trending` | Trending articles |
| `/search` | Search |
| `/article/:id` | Article detail |
| `/editor` | Write article |
| `/drafts` | My drafts |
| `/published` | My published articles |
| `/bookmarks` | Saved articles |
| `/notifications` | Notifications |
| `/analytics` | Author analytics dashboard |
| `/profile` | Own profile |
| `/user/:id` | Public user profile |
| `/admin` | Admin review panel |
| `/dashboard` | Dashboard |
| `/settings` | Settings |
| `/login` | Login page |
| `/register` | Register page |

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add Authorized redirect URI: `http://localhost:5000/auth/google/callback`
5. Copy Client ID and Secret into `Backend/.env`

---

## Useful Debug Commands

```powershell
# Check if backend is running
Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing

# Check ClickHouse tables
docker exec -it timessea_clickhouse clickhouse-client --query "SHOW TABLES FROM analytics"

# Check Redis keys
docker exec -it timessea_redis redis-cli KEYS "*"

# Check PostgreSQL connection
cd C:\Sitarahub\nEWS\Backend
npx prisma studio

# Kill process on port 5000 (if port conflict)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```
