# Analytics Infrastructure Setup Guide

## 🎯 Overview

This document explains how to set up and use the analytics infrastructure for the Timessea news platform.

**Architecture:**

- **PostgreSQL** → Source of truth (users, posts, moderation status)
- **Redis** → Live counters and job queues
- **ClickHouse** → Analytics event storage (billions of events)
- **BullMQ** → Async job processing

---

## 📦 What's Installed

### Services (Docker)

- **Redis** (port 6379) - Queue and live counters
- **ClickHouse** (ports 8123, 9000) - Analytics database

### NPM Packages

- `@clickhouse/client` - ClickHouse Node.js client
- `bullmq` - Job queue processor
- `ioredis` - Redis client
- `@nestjs/bullmq` - NestJS BullMQ integration
- `@nestjs/config` - Environment configuration

---

## 🚀 Quick Start

### 1. Start Analytics Infrastructure

```bash
# Start Redis and ClickHouse
docker compose up -d

# Verify services are running
docker ps

# Check ClickHouse is ready
curl http://localhost:8123
# Should return: Ok.
```

### 2. Verify ClickHouse Schema

```bash
# Access ClickHouse CLI
docker exec -it timessea_clickhouse clickhouse-client

# Check database and tables
SHOW DATABASES;
USE analytics;
SHOW TABLES;

# You should see:
# - events
# - daily_metrics
# - user_activity
# - post_engagement

# Exit
exit;
```

### 3. Start Backend

```bash
npm run start:dev
```

**On startup, you should see:**

```
✅ Redis connected successfully
✅ ClickHouse connected successfully
```

---

## 📊 Analytics Events

### Event Types

```typescript
// Post Events
POST_VIEW; // User views a post
POST_READ; // User reads post (5-10s)
POST_APPROVED; // Moderator approves
POST_REJECTED; // Moderator rejects

// Engagement Events
LIKE; // User likes post
COMMENT; // User comments
SHARE; // User shares
REPORT; // User reports content

// User Events
USER_LOGIN; // User login
USER_SIGNUP; // New user registration
FOLLOW; // Follow user
```

### Tracking Events

**From your NestJS controller:**

```typescript
import {
  AnalyticsService,
  AnalyticsEventType,
} from './analytics/analytics.service';

@Injectable()
export class PostsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get(':id')
  async getPost(@Param('id') id: string, @Request() req) {
    // Track post view
    await this.analyticsService.track({
      event: AnalyticsEventType.POST_VIEW,
      user_id: req.user.id,
      post_id: id,
      post_status: 'approved',
      location_id: req.user.location_id,
      device: this.getDeviceType(req),
      metadata: {
        referrer: req.headers.referer,
      },
    });

    return this.postsService.findOne(id);
  }
}
```

**From frontend (via API):**

```typescript
// Next.js / React
const trackEvent = async (event) => {
  await fetch('/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
};

// Track post view
trackEvent({
  event: 'post_view',
  user_id: currentUser.id,
  post_id: postId,
  device: 'mobile',
});
```

---

## 📈 Querying Analytics

### API Endpoints

#### Post Analytics

```bash
GET /analytics/post/:postId

Response:
{
  "post_id": "uuid",
  "views": 1523,
  "unique_views": 891,
  "reads": 456,
  "likes": 123,
  "comments": 45,
  "shares": 23,
  "engagement_rate": 12.5
}
```

#### Platform Analytics (Admin)

```bash
GET /analytics/platform

Response:
{
  "active_users_today": 2341,
  "active_users_week": 15234,
  "posts_today": 456,
  "posts_approved_today": 389,
  "posts_rejected_today": 67,
  "total_engagement_today": 5678
}
```

#### Trending Posts

```bash
GET /analytics/trending?limit=20

Response:
[
  {
    "post_id": "uuid",
    "views": 5432,
    "likes": 234,
    "comments": 56,
    "shares": 89,
    "engagement_score": 1234
  }
]
```

#### Moderation Analytics

```bash
GET /analytics/moderation?days=7

Response:
[
  {
    "date": "2026-02-09",
    "approved": 234,
    "rejected": 45
  }
]
```

---

## 🔧 How It Works

### Event Flow

```
User Action
    ↓
NestJS Controller
    ↓
AnalyticsService.track()
    ↓
BullMQ Queue (Redis)
    ↓
AnalyticsProcessor (Worker)
    ↓
ClickHouse Database
```

### Why This Architecture?

1. **Non-blocking**: API calls remain fast (events queued, not written synchronously)
2. **Reliable**: BullMQ handles retries if ClickHouse is temporarily down
3. **Scalable**: Can handle millions of events/day
4. **Fast queries**: ClickHouse optimized for analytics queries

---

## 🛠 Monitoring

### Queue Health

```bash
GET /analytics/queue/health

Response:
{
  "waiting": 45,
  "active": 3,
  "completed": 123456,
  "failed": 12
}
```

### Redis Live Counters

```bash
# Connect to Redis
docker exec -it timessea_redis redis-cli

# Check active users today
SCARD active_users:2026-02-09

# Check post views
GET post:uuid:views

# Check online admins
SCARD admin:online
```

### ClickHouse Queries

```bash
docker exec -it timessea_clickhouse clickhouse-client

# Total events today
SELECT count() FROM analytics.events WHERE created_at >= today();

# Events by type
SELECT event, count() FROM analytics.events
WHERE created_at >= today()
GROUP BY event
ORDER BY count() DESC;

# Top active users
SELECT user_id, count() FROM analytics.events
WHERE created_at >= today()
GROUP BY user_id
ORDER BY count() DESC
LIMIT 10;
```

---

## 💾 Data Retention

**ClickHouse TTL**: Events are automatically deleted after 2 years.

To change retention:

```sql
ALTER TABLE analytics.events
MODIFY TTL created_at + INTERVAL 1 YEAR;
```

---

## 🐛 Troubleshooting

### Redis not connecting

```bash
docker logs timessea_redis
docker restart timessea_redis
```

### ClickHouse not starting

```bash
docker logs timessea_clickhouse
# Check disk space
docker exec timessea_clickhouse df -h
```

### Events not being processed

```bash
# Check queue health
curl http://localhost:5000/analytics/queue/health

# Check worker logs
# Look for console.log output in NestJS terminal
```

### Reset ClickHouse data

```bash
docker exec -it timessea_clickhouse clickhouse-client

DROP DATABASE analytics;

# Then restart container to re-run init script
docker restart timessea_clickhouse
```

---

## 🎯 Next Steps

1. **Add authentication** to admin endpoints (uncomment `@UseGuards(AdminGuard)`)
2. **Create dashboards** in Next.js using the analytics APIs
3. **Add more events** as needed (follow existing patterns)
4. **Set up monitoring** (Grafana + ClickHouse)
5. **Configure backups** for ClickHouse data

---

## 📚 Resources

- [ClickHouse Documentation](https://clickhouse.com/docs)
- [BullMQ Guide](https://docs.bullmq.io/)
- [Redis Commands](https://redis.io/commands)

---

## ⚠️ Important Rules

❌ **NEVER** write analytics directly to ClickHouse from controllers
❌ **NEVER** store analytics in PostgreSQL
❌ **NEVER** use analytics for real-time features (use Redis counters instead)

✅ **ALWAYS** use `AnalyticsService.track()` for events
✅ **ALWAYS** query ClickHouse for historical data
✅ **ALWAYS** use Redis for live counters
