
-- Advanced Analytics Schema for Scalable View Counting

-- 1. Optimized Raw Events Table (Append-Only)
-- Stored for 30 days for detailed debugging/auditing
CREATE TABLE IF NOT EXISTS analytics.raw_views (
    event_time DateTime DEFAULT now(),
    post_id UUID,
    user_id Nullable(String), -- Logged in User ID
    client_id String, -- Persistent Client ID (Anonymous or Logged in)
    device LowCardinality(String),
    duration UInt32, -- Duration in seconds
    ip String,
    referrer String,
    metadata String -- JSON metadata
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (post_id, event_time, client_id)
TTL event_time + INTERVAL 30 DAY;

-- 2. Materialized View for Daily Post Stats
-- Uses AggregatingMergeTree for accurate unique counts
CREATE TABLE IF NOT EXISTS analytics.daily_post_stats (
    date Date,
    post_id UUID,
    views_count SimpleAggregateFunction(sum, UInt64),
    unique_viewers AggregateFunction(uniq, String), -- Counts unique client_ids
    total_duration SimpleAggregateFunction(sum, UInt64)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (post_id, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_post_stats_mv
TO analytics.daily_post_stats
AS SELECT
    toDate(event_time) as date,
    post_id,
    count() as views_count, -- Total raw views (including repeats if allowed by logic)
    uniqState(client_id) as unique_viewers, -- HyperLogLog for unique viewers
    sum(duration) as total_duration
FROM analytics.raw_views
GROUP BY date, post_id;

-- 3. Materialized View for Total Post Stats (All Time)
-- Aggregates from the daily view for faster querying
CREATE TABLE IF NOT EXISTS analytics.total_post_stats (
    post_id UUID,
    total_views SimpleAggregateFunction(sum, UInt64),
    total_unique_viewers AggregateFunction(uniq, String)
) ENGINE = AggregatingMergeTree()
ORDER BY post_id;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.total_post_stats_mv
TO analytics.total_post_stats
AS SELECT
    post_id,
    count() as total_views,
    uniqState(client_id) as total_unique_viewers
FROM analytics.raw_views
GROUP BY post_id;
