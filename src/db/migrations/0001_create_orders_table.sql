-- Migration number: 0001 	 2026-04-11T14:23:20.983Z
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,               -- UUIDv4 for backend/gateway relations
    order_id TEXT NOT NULL,            -- YYMMDD_XXXX for user-facing reference
    customer_email TEXT NOT NULL,
    status TEXT NOT NULL,              -- pending | success | failed | cancelled
    fulfillment_status TEXT,            -- unfulfilled | fulfilled | shipped
    type TEXT NOT NULL DEFAULT 'one_time', -- one_time | subscription
    total_amount INTEGER NOT NULL,       -- Stored as lowest currency denominator (e.g., cents)
    checkout_payload TEXT NOT NULL,     -- JSON string of the raw user input
    cart_state TEXT NOT NULL,           -- JSON string of the calculated cart engine state
    subscription_id TEXT,              -- Stripe sub_xxx for recurring event lookups
    subscription_status TEXT,           -- active | cancelled | past_due | etc.
    provider_order_id TEXT,             -- Gateway-specific order ID (Chip-in purchase ID, Stripe session ID)
    expires_at INTEGER NOT NULL,       -- Unix timestamp for future cleanup workflows
    order_tracking_id TEXT,                  -- Optional ID for order fulfillment 
    user_tracking_id TEXT,                    -- Optional ID for frontend analytics/abandoned cart mapping
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status_expires ON orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_subscription_id ON orders(subscription_id);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
