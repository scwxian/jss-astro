# Events API

## Overview
Events are records of significant occurrences in your Stripe account. You can retrieve events via the API or receive them via webhooks.

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events/:id` | Retrieve event |
| GET | `/events` | List all events |

---

## Retrieve Event

### Request
```
GET /events/:id
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl https://api.stripe.com/v1/events/evt_abc123 \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
```json
{
  "id": "evt_1NG8Du2eZvKYlo2CUI79vXWy",
  "object": "event",
  "api_version": "2024-10-28.acacia",
  "created": 1686089970,
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "object": "checkout.session",
      "status": "complete",
      "payment_intent": "pi_abc123",
      "customer": "cus_abc123"
    }
  },
  "livemode": false,
  "pending_webhooks": 0,
  "request": {
    "id": "req_abc123",
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}
```

---

## List Events

### Request
```
GET /events
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface EventList {
  limit?: number;           // Max: 100, Default: 10
  starting_after?: string;  // Cursor for pagination
  ending_before?: string;   // Cursor for pagination
  type?: string;            // Filter by event type
  types?: string[];         // Filter by multiple event types (max 20)
  created?: {              // Filter by creation date
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
  delivery_success?: boolean;  // Filter by delivery status
}
```

### Example Request
```bash
curl -G https://api.stripe.com/v1/events \
  -u "sk_test_abc123...:" \
  -d limit=10 \
  -d type=checkout.session.completed
```

### Example Request (Multiple Types)
```bash
curl -G https://api.stripe.com/v1/events \
  -u "sk_test_abc123...:" \
  -d limit=10 \
  -d "types[]=checkout.session.completed" \
  -d "types[]=customer.subscription.created"
```

### Response (200 OK)
```json
{
  "object": "list",
  "data": [
    {
      "id": "evt_1NG8Du2eZvKYlo2CUI79vXWy",
      "object": "event",
      "api_version": "2024-10-28.acacia",
      "created": 1686089970,
      "data": {
        "object": {
          "id": "cs_test_abc123",
          "object": "checkout.session",
          "status": "complete"
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "type": "checkout.session.completed"
    }
  ],
  "has_more": false,
  "url": "/v1/events"
}
```

---

## Event Object Schema

```typescript
interface Event {
  id: string;                    // evt_...
  object: 'event';
  
  // Event Type
  type: string;                 // e.g., 'checkout.session.completed'
  
  // API Version
  api_version: string;
  
  // Data
  data: {
    object: any;                // The object that triggered the event
    previous_attributes?: any;  // Previous values (for updates)
  };
  
  // Timestamps
  created: number;              // Unix timestamp
  livemode: boolean;
  
  // Pending Webhooks
  pending_webhooks: number;
  
  // Request
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
}
```

---

## Event Types

### Checkout Events

#### checkout.session.completed
Fired when a Checkout Session has been successfully completed.

```typescript
interface CheckoutSessionCompletedEvent {
  id: string;
  object: 'event';
  type: 'checkout.session.completed';
  data: {
    object: CheckoutSession;
  };
}
```

#### checkout.session.expired
Fired when a Checkout Session has expired.

```typescript
interface CheckoutSessionExpiredEvent {
  id: string;
  object: 'event';
  type: 'checkout.session.expired';
  data: {
    object: CheckoutSession;
  };
}
```

#### checkout.session.async_payment_succeeded
Fired when an async payment for a Checkout Session succeeds.

```typescript
interface CheckoutSessionAsyncPaymentSucceededEvent {
  id: string;
  object: 'event';
  type: 'checkout.session.async_payment_succeeded';
  data: {
    object: CheckoutSession;
  };
}
```

#### checkout.session.async_payment_failed
Fired when an async payment for a Checkout Session fails.

```typescript
interface CheckoutSessionAsyncPaymentFailedEvent {
  id: string;
  object: 'event';
  type: 'checkout.session.async_payment_failed';
  data: {
    object: CheckoutSession;
  };
}
```

---

### Customer Events

#### customer.created
Fired when a new customer is created.

```typescript
interface CustomerCreatedEvent {
  id: string;
  object: 'event';
  type: 'customer.created';
  data: {
    object: Customer;
  };
}
```

#### customer.updated
Fired when a customer is updated.

```typescript
interface CustomerUpdatedEvent {
  id: string;
  object: 'event';
  type: 'customer.updated';
  data: {
    object: Customer;
    previous_attributes: Partial<Customer>;
  };
}
```

#### customer.deleted
Fired when a customer is deleted.

```typescript
interface CustomerDeletedEvent {
  id: string;
  object: 'event';
  type: 'customer.deleted';
  data: {
    object: Customer;
  };
}
```

---

### Subscription Events

#### customer.subscription.created
Fired when a new subscription is created.

```typescript
interface SubscriptionCreatedEvent {
  id: string;
  object: 'event';
  type: 'customer.subscription.created';
  data: {
    object: Subscription;
  };
}
```

#### customer.subscription.updated
Fired when a subscription is updated.

```typescript
interface SubscriptionUpdatedEvent {
  id: string;
  object: 'event';
  type: 'customer.subscription.updated';
  data: {
    object: Subscription;
    previous_attributes: Partial<Subscription>;
  };
}
```

#### customer.subscription.deleted
Fired when a subscription is canceled.

```typescript
interface SubscriptionDeletedEvent {
  id: string;
  object: 'event';
  type: 'customer.subscription.deleted';
  data: {
    object: Subscription;
  };
}
```

#### customer.subscription.paused
Fired when a subscription is paused.

```typescript
interface SubscriptionPausedEvent {
  id: string;
  object: 'event';
  type: 'customer.subscription.paused';
  data: {
    object: Subscription;
  };
}
```

#### customer.subscription.resumed
Fired when a subscription is resumed.

```typescript
interface SubscriptionResumedEvent {
  id: string;
  object: 'event';
  type: 'customer.subscription.resumed';
  data: {
    object: Subscription;
  };
}
```

#### customer.subscription.trial_will_end
Fired 3 days before a subscription trial period ends.

```typescript
interface SubscriptionTrialWillEndEvent {
  id: string;
  object: 'event';
  type: 'customer.subscription.trial_will_end';
  data: {
    object: Subscription;
  };
}
```

---

### Invoice Events

#### invoice.created
Fired when a new invoice is created.

```typescript
interface InvoiceCreatedEvent {
  id: string;
  object: 'event';
  type: 'invoice.created';
  data: {
    object: Invoice;
  };
}
```

#### invoice.finalized
Fired when an invoice is finalized.

```typescript
interface InvoiceFinalizedEvent {
  id: string;
  object: 'event';
  type: 'invoice.finalized';
  data: {
    object: Invoice;
  };
}
```

#### invoice.paid
Fired when an invoice is paid.

```typescript
interface InvoicePaidEvent {
  id: string;
  object: 'event';
  type: 'invoice.paid';
  data: {
    object: Invoice;
  };
}
```

#### invoice.payment_failed
Fired when an invoice payment fails.

```typescript
interface InvoicePaymentFailedEvent {
  id: string;
  object: 'event';
  type: 'invoice.payment_failed';
  data: {
    object: Invoice;
  };
}
```

#### invoice.payment_action_required
Fired when payment requires additional action (e.g., 3D Secure).

```typescript
interface InvoicePaymentActionRequiredEvent {
  id: string;
  object: 'event';
  type: 'invoice.payment_action_required';
  data: {
    object: Invoice;
  };
}
```

#### invoice.upcoming
Fired 7 days before a subscription's next invoice.

```typescript
interface InvoiceUpcomingEvent {
  id: string;
  object: 'event';
  type: 'invoice.upcoming';
  data: {
    object: Invoice;
  };
}
```

---

### Payment Intent Events

#### payment_intent.succeeded
Fired when a PaymentIntent succeeds.

```typescript
interface PaymentIntentSucceededEvent {
  id: string;
  object: 'event';
  type: 'payment_intent.succeeded';
  data: {
    object: PaymentIntent;
  };
}
```

#### payment_intent.payment_failed
Fired when a PaymentIntent fails.

```typescript
interface PaymentIntentPaymentFailedEvent {
  id: string;
  object: 'event';
  type: 'payment_intent.payment_failed';
  data: {
    object: PaymentIntent;
  };
}
```

#### payment_intent.amount_capturable_updated
Fired when a PaymentIntent's amount_capturable is updated.

```typescript
interface PaymentIntentAmountCapturableUpdatedEvent {
  id: string;
  object: 'event';
  type: 'payment_intent.amount_capturable_updated';
  data: {
    object: PaymentIntent;
  };
}
```

#### payment_intent.canceled
Fired when a PaymentIntent is canceled.

```typescript
interface PaymentIntentCanceledEvent {
  id: string;
  object: 'event';
  type: 'payment_intent.canceled';
  data: {
    object: PaymentIntent;
  };
}
```

---

### Payment Method Events

#### payment_method.attached
Fired when a PaymentMethod is attached to a Customer.

```typescript
interface PaymentMethodAttachedEvent {
  id: string;
  object: 'event';
  type: 'payment_method.attached';
  data: {
    object: PaymentMethod;
  };
}
```

#### payment_method.detached
Fired when a PaymentMethod is detached from a Customer.

```typescript
interface PaymentMethodDetachedEvent {
  id: string;
  object: 'event';
  type: 'payment_method.detached';
  data: {
    object: PaymentMethod;
  };
}
```

#### payment_method.updated
Fired when a PaymentMethod is updated.

```typescript
interface PaymentMethodUpdatedEvent {
  id: string;
  object: 'event';
  type: 'payment_method.updated';
  data: {
    object: PaymentMethod;
    previous_attributes: Partial<PaymentMethod>;
  };
}
```

---

### Charge Events

#### charge.succeeded
Fired when a charge succeeds.

```typescript
interface ChargeSucceededEvent {
  id: string;
  object: 'event';
  type: 'charge.succeeded';
  data: {
    object: Charge;
  };
}
```

#### charge.failed
Fired when a charge fails.

```typescript
interface ChargeFailedEvent {
  id: string;
  object: 'event';
  type: 'charge.failed';
  data: {
    object: Charge;
  };
}
```

#### charge.refunded
Fired when a charge is refunded.

```typescript
interface ChargeRefundedEvent {
  id: string;
  object: 'event';
  type: 'charge.refunded';
  data: {
    object: Charge;
  };
}
```

#### charge.captured
Fired when a charge is captured.

```typescript
interface ChargeCapturedEvent {
  id: string;
  object: 'event';
  type: 'charge.captured';
  data: {
    object: Charge;
  };
}
```

---

### Dispute Events

#### charge.dispute.created
Fired when a dispute is created.

```typescript
interface DisputeCreatedEvent {
  id: string;
  object: 'event';
  type: 'charge.dispute.created';
  data: {
    object: Dispute;
  };
}
```

#### charge.dispute.updated
Fired when a dispute is updated.

```typescript
interface DisputeUpdatedEvent {
  id: string;
  object: 'event';
  type: 'charge.dispute.updated';
  data: {
    object: Dispute;
    previous_attributes: Partial<Dispute>;
  };
}
```

#### charge.dispute.closed
Fired when a dispute is closed.

```typescript
interface DisputeClosedEvent {
  id: string;
  object: 'event';
  type: 'charge.dispute.closed';
  data: {
    object: Dispute;
  };
}
```

---

## Cloudflare Workers Examples

### Get Recent Events
```typescript
interface Env {
  STRIPE_SECRET_KEY: string;
}

async function getRecentEvents(
  types?: string[],
  limit: number = 10
): Promise<Event[]> {
  const params = new URLSearchParams({
    limit: limit.toString()
  });
  
  if (types && types.length > 0) {
    types.forEach(type => {
      params.append('types[]', type);
    });
  }
  
  const response = await fetch(
    `https://api.stripe.com/v1/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get events');
  }
  
  const result = await response.json();
  return result.data;
}
```

### Get Checkout Completed Events
```typescript
async function getCheckoutCompletedEvents(
  since?: number
): Promise<Event[]> {
  const params = new URLSearchParams({
    type: 'checkout.session.completed',
    limit: '100'
  });
  
  if (since) {
    params.append('created[gte]', since.toString());
  }
  
  const response = await fetch(
    `https://api.stripe.com/v1/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get events');
  }
  
  const result = await response.json();
  return result.data;
}
```

### Get Subscription Events for Customer
```typescript
async function getSubscriptionEvents(
  customerId: string
): Promise<Event[]> {
  const params = new URLSearchParams({
    limit: '100',
    'types[]': 'customer.subscription.created',
    'types[]': 'customer.subscription.updated',
    'types[]': 'customer.subscription.deleted'
  });
  
  const response = await fetch(
    `https://api.stripe.com/v1/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get events');
  }
  
  const result = await response.json();
  
  // Filter by customer
  return result.data.filter((event: Event) => {
    const subscription = event.data.object as Subscription;
    return subscription.customer === customerId;
  });
}
```

### Get Failed Payment Events
```typescript
async function getFailedPaymentEvents(
  since?: number
): Promise<Event[]> {
  const params = new URLSearchParams({
    limit: '100',
    'types[]': 'invoice.payment_failed',
    'types[]': 'payment_intent.payment_failed',
    'types[]': 'charge.failed'
  });
  
  if (since) {
    params.append('created[gte]', since.toString());
  }
  
  const response = await fetch(
    `https://api.stripe.com/v1/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get events');
  }
  
  const result = await response.json();
  return result.data;
}
```

---

## Notes

- **Events are retained for 30 days** - Older events are not available
- **Use webhooks** for real-time notifications instead of polling
- **Event ordering** - Events for the same object are delivered sequentially
- **Idempotency** - Same event may be delivered multiple times
- **API version** - Events are rendered according to the API version at creation time
- **Test mode events** - Only visible with test mode API keys