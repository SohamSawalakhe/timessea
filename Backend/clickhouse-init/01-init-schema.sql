-- Create analytics database
CREATE DATABASE IF NOT EXISTS analytics;

-- Create analytics events table
CREATE TABLE IF NOT EXISTS analytics.events (
    event LowCardinality(String) COMMENT 'Event type: post_view, post_read, like, comment, share, etc.',
    user_id UUID COMMENT 'User who performed the action',
    post_id Nullable(UUID) COMMENT 'Post ID if applicable',
    post_status LowCardinality(Nullable(String)) COMMENT 'Post status: pending, approved, rejected',
    location_id Nullable(UInt32) COMMENT 'Location ID for geo analytics',
    device LowCardinality(Nullable(String)) COMMENT 'Device type: mobile, web, tablet',
    metadata String DEFAULT '{}' COMMENT 'Additional JSON metadata',
    created_at DateTime DEFAULT now() COMMENT 'Event timestamp'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (event, created_at, user_id)
TTL created_at + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192
COMMENT 'Analytics events table for tracking user interactions';

-- Create materialized view for daily metrics (pre-aggregated for faster queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_metrics
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event, post_id)
AS SELECT
    toDate(created_at) AS date,
    event,
    assumeNotNull(post_id) AS post_id,
    count() AS event_count,
    uniq(user_id) AS unique_users
FROM analytics.events
WHERE post_id IS NOT NULL
GROUP BY date, event, post_id;

-- Create materialized view for user activity (DAU/MAU tracking)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.user_activity
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id)
AS SELECT
    toDate(created_at) AS date,
    user_id,
    uniqState(event) AS unique_events,
    countState() AS total_events
FROM analytics.events
GROUP BY date, user_id;

-- Create post engagement summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.post_engagement
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, post_id)
AS SELECT
    toDate(created_at) AS date,
    assumeNotNull(post_id) AS post_id,
    countIf(event = 'post_view') AS views,
    countIf(event = 'post_read') AS reads,
    countIf(event = 'like') AS likes,
    countIf(event = 'comment') AS comments,
    countIf(event = 'share') AS shares,
    uniq(user_id) AS unique_viewers
FROM analytics.events
WHERE post_id IS NOT NULL
GROUP BY date, post_id;
