# Stripe API Reference

## Overview
Stripe is a payment processing platform for online businesses. Supports card payments, subscriptions, one-time payments, and various payment methods worldwide.

## Base URL
```
https://api.stripe.com/v1
```

## Authentication
All requests require API key in Authorization header:
```
Authorization: Bearer <secret_key>
```

Get API keys from: https://dashboard.stripe.com/apikeys

### Key Types
| Type | Description |
|------|-------------|
| **Secret Key** | Server-side API calls (prefix: `sk_test_` or `sk_live_`) |
| **Publishable Key** | Client-side integration (prefix: `pk_test_` or `pk_live_`) |

## Key Concepts

### Checkout Flow (One-Time Payment)
1. **Create Checkout Session** → Returns `url` and `id`
2. **Redirect Customer** → Customer pays at Stripe-hosted page
3. **Payment Complete** → Customer redirected to `success_url`
4. **Webhook Callback** → Server receives `checkout.session.completed` event
5. **Verify Signature** → Validate webhook authenticity using HMAC-SHA256

### Subscription Flow
1. **Create Customer** → Store customer details
2. **Create Product & Price** → Define subscription offering
3. **Create Checkout Session** (mode: subscription) → Or create subscription directly
4. **Payment Complete** → Customer redirected to `success_url`
5. **Webhook Events** → Handle `customer.subscription.*` events
6. **Manage Subscription** → Cancel, pause, resume as needed

### Pricing (CRITICAL)
All prices are in **cents** (smallest currency unit):
- `$1.00` → `unit_amount: 100`
- `$45.00` → `unit_amount: 4500`

### Checkout Session Status
| Status | Description |
|--------|-------------|
| `open` | Session active, awaiting payment |
| `complete` | Payment successful |
| `expired` | Session expired |

### Subscription Status
| Status | Description |
|--------|-------------|
| `active` | Subscription is active |
| `canceled` | Subscription canceled |
| `incomplete` | First payment failed |
| `incomplete_expired` | First payment failed, expired |
| `past_due` | Payment overdue |
| `paused` | Subscription paused |
| `trialing` | In trial period |
| `unpaid` | Payment failed, not paid |

### Payment Intent Status
| Status | Description |
|--------|-------------|
| `requires_payment_method` | Awaiting payment method |
| `requires_confirmation` | Awaiting confirmation |
| `requires_action` | Requires customer action (e.g., 3DS) |
| `processing` | Payment processing |
| `succeeded` | Payment successful |
| `canceled` | Payment canceled |
| `failed` | Payment failed |

## Test Environment

### Test Cards
| Card Number | Type | Result |
|-------------|------|--------|
| `4242 4242 4242 4242` | Visa | Success |
| `4000 0025 0000 3155` | Visa | 3D Secure required |
| `4000 0000 0000 0002` | Visa | Decline |
| `5555 5555 5555 4444` | Mastercard | Success |

**Test Details:**
- CVC: Any 3 digits
- Expiry: Any future date
- Postal code: Any 5 digits

### Test Clocks
Use test clocks for subscription testing:
- Simulate time passage
- Test billing cycles
- Test trial periods

### Test Mode
Use test API keys (prefix: `sk_test_`). All objects created with test keys are marked `livemode: false`.

## Files in This Reference

| File | Description |
|------|-------------|
| `authentication.md` | API key auth, webhook signature verification |
| `customers.md` | Customer CRUD operations |
| `products-prices.md` | Product and Price management |
| `checkout-sessions.md` | Checkout Sessions for payment/subscription |
| `subscriptions.md` | Subscription management |
| `payment-methods.md` | Payment method attach/detach |
| `webhooks.md` | Webhook handling, signature verification |
| `events.md` | Event types and retrieval |
| `schemas.md` | Shared data types, enums, error formats |

## Quick Reference

### Create Checkout Session (One-Time Payment)
```json
POST /checkout/sessions
{
  "line_items": [
    {
      "price_data": {
        "currency": "usd",
        "product_data": {
          "name": "Product Name"
        },
        "unit_amount": 4500
      },
      "quantity": 1
    }
  ],
  "mode": "payment",
  "success_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/cancel"
}
```

### Response
```json
{
  "id": "cs_test_...",
  "object": "checkout.session",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "status": "open"
}
```

### Create Checkout Session (Subscription)
```json
POST /checkout/sessions
{
  "line_items": [
    {
      "price": "price_abc123",
      "quantity": 1
    }
  ],
  "mode": "subscription",
  "success_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/cancel"
}
```

### Create Customer
```json
POST /customers
{
  "email": "customer@example.com",
  "name": "John Doe",
  "metadata": {
    "user_id": "12345"
  }
}
```

### Create Subscription
```json
POST /subscriptions
{
  "customer": "cus_abc123",
  "items": [
    {
      "price": "price_xyz789"
    }
  ]
}
```

### Webhook Event (checkout.session.completed)
```json
{
  "id": "evt_...",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_...",
      "object": "checkout.session",
      "status": "complete",
      "payment_intent": "pi_...",
      "customer": "cus_..."
    }
  }
}
```

## Error Handling
All errors return HTTP 4xx/5xx with JSON body:
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "descriptive error message",
    "code": "parameter_missing"
  }
}
```

## Rate Limits
- Standard endpoints: 100 read operations/sec, 100 write operations/sec
- Higher limits available for enterprise accounts

## Idempotency
Use `Idempotency-Key` header for safe retries:
```http
POST /v1/checkout/sessions
Idempotency-Key: unique-key-123
Content-Type: application/json
```

## Notes

- **Always use cents** for monetary values
- **Use test keys** in development
- **Verify webhook signatures** on every request
- **Use idempotency keys** for safe retries
- **Handle all subscription events** for reliable billing