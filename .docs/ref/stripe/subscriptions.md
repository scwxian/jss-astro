# Subscriptions API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/subscriptions` | Create subscription |
| GET | `/subscriptions/:id` | Retrieve subscription |
| POST | `/subscriptions/:id` | Update subscription |
| DELETE | `/subscriptions/:id` | Cancel subscription |
| GET | `/subscriptions` | List all subscriptions |
| POST | `/subscriptions/:id/resume` | Resume paused subscription |

---

## Create Subscription

### Request
```
POST /subscriptions
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface SubscriptionCreate {
  // REQUIRED
  customer: string;          // Customer ID
  items: Array<{
    price: string;           // Price ID
    quantity?: number;        // Default: 1
    metadata?: Record<string, string>;
  }>;
  
  // OPTIONAL
  add_invoice_items?: Array<{
    price: string;
    quantity?: number;
    tax_rates?: string[];
  }>;
  
  application_fee_percent?: number;  // 0-100
  automatic_tax?: {
    enabled: boolean;
    liability?: { account?: string };
  };
  
  backdate_start_date?: number;      // Unix timestamp
  billing_cycle_anchor?: number;     // Unix timestamp
  billing_thresholds?: {
    reset_billing_cycle_anchor?: boolean;
  };
  
  cancel_at?: number;                // Unix timestamp
  cancel_at_period_end?: boolean;   // Cancel at period end
  
  collection_method?: 'charge_automatically' | 'send_invoice';
  days_until_due?: number;          // For send_invoice
  
  default_payment_method?: string;
  default_source?: string;
  default_tax_rates?: string[];
  
  description?: string;
  discount?: {
    coupon?: string;
    promotion_code?: string;
  };
  
  invoice_settings?: {
    issuer?: {
      type: 'self' | 'account';
      account?: string;
    };
  };
  
  metadata?: Record<string, string>;
  
  on_behalf_of?: string;
  
  payment_behavior?: 'error_if_incomplete' | 'default_incomplete' | 'allow_incomplete' | 'pending_if_incomplete';
  
  payment_settings?: {
    payment_method_options?: {
      acss_debit?: {
        mandate_options?: {
          transaction_type?: 'personal' | 'business';
        };
      };
      card?: {
        request_three_d_secure?: 'automatic' | 'any';
      };
    };
    payment_method_types?: string[];
    save_default_payment_method?: 'on_subscription' | 'off';
  };
  
  pending_invoice_item_interval?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
  };
  
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
  proration_date?: number;          // Unix timestamp
  
  transfer_data?: {
    destination: string;
    amount_percent?: number;
  };
  
  trial_end?: number;                // Unix timestamp
  trial_from_plan?: boolean;
  trial_period_days?: number;
  trial_settings?: {
    end_behavior?: {
      missing_payment_method?: 'cancel' | 'create_invoice';
    };
  };
}
```

### Example Request (Basic)
```bash
curl https://api.stripe.com/v1/subscriptions \
  -u "sk_test_abc123...:" \
  -d customer=cus_Na6dX7aXxi11N4 \
  -d "items[0][price]"=price_1MowQULkdIwHu7ixraBm864M
```

### Example Request (With Trial)
```bash
curl https://api.stripe.com/v1/subscriptions \
  -u "sk_test_abc123...:" \
  -d customer=cus_Na6dX7aXxi11N4 \
  -d "items[0][price]"=price_1MowQULkdIwHu7ixraBm864M \
  -d trial_period_days=14
```

### Example Request (With Payment Method)
```bash
curl https://api.stripe.com/v1/subscriptions \
  -u "sk_test_abc123...:" \
  -d customer=cus_Na6dX7aXxi11N4 \
  -d "items[0][price]"=price_1MowQULkdIwHu7ixraBm864M \
  -d default_payment_method=pm_abc123 \
  -d payment_behavior=error_if_incomplete
```

### Response (200 OK)
```json
{
  "id": "sub_1MoGGtLkdIwHu7ixk5CfdiqC",
  "object": "subscription",
  "application_fee_percent": null,
  "automatic_tax": {
    "enabled": false,
    "liability": null
  },
  "billing_cycle_anchor": 1679447726,
  "cancel_at": null,
  "cancel_at_period_end": false,
  "canceled_at": null,
  "cancellation_details": {
    "comment": null,
    "feedback": null,
    "reason": null
  },
  "collection_method": "charge_automatically",
  "created": 1679447723,
  "currency": "usd",
  "customer": "cus_NZP5i1diUz55jp",
  "days_until_due": null,
  "default_payment_method": null,
  "default_source": null,
  "default_tax_rates": [],
  "description": null,
  "discount": null,
  "ended_at": null,
  "invoice_settings": {
    "issuer": {
      "type": "self"
    }
  },
  "items": {
    "object": "list",
    "data": [
      {
        "id": "si_NZP5BhUIuWzXDG",
        "object": "subscription_item",
        "billing_thresholds": null,
        "created": 1679447724,
        "metadata": {},
        "price": {
          "id": "price_1MoGGsLkdIwHu7ixA9yHsq2N",
          "object": "price",
          "active": true,
          "currency": "usd",
          "recurring": {
            "interval": "month",
            "interval_count": 1
          },
          "type": "recurring",
          "unit_amount": 1999
        },
        "quantity": 1,
        "subscription": "sub_1MoGGtLkdIwHu7ixk5CfdiqC"
      }
    ]
  },
  "latest_invoice": "in_1MoGGwLkdIwHu7ixHSrelo8X",
  "livemode": false,
  "metadata": {},
  "next_pending_invoice_item_invoice": null,
  "pause_collection": null,
  "payment_settings": {
    "payment_method_options": null,
    "payment_method_types": null,
    "save_default_payment_method": "off"
  },
  "pending_invoice_item_interval": null,
  "pending_setup_intent": null,
  "pending_update": null,
  "plan": {
    "id": "price_1MoGGsLkdIwHu7ixA9yHsq2N",
    "object": "plan",
    "active": true,
    "amount": 1999,
    "currency": "usd",
    "interval": "month",
    "interval_count": 1
  },
  "quantity": 1,
  "schedule": null,
  "start_date": 1679447723,
  "status": "active",
  "test_clock": null,
  "transfer_data": null,
  "trial_end": null,
  "trial_settings": {
    "end_behavior": {
      "missing_payment_method": "create_invoice"
    }
  },
  "trial_start": null
}
```

---

## Retrieve Subscription

### Request
```
GET /subscriptions/:id
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl https://api.stripe.com/v1/subscriptions/sub_1MoGGtLkdIwHu7ixk5CfdiqC \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
Returns full `Subscription` object.

---

## Update Subscription

### Request
```
POST /subscriptions/:id
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Updatable Fields
- `items` - Update subscription items
- `metadata` - Custom metadata
- `description` - Description
- `default_payment_method` - Default payment method
- `default_source` - Default source
- `default_tax_rates` - Tax rates
- `cancel_at_period_end` - Cancel at period end
- `cancel_at` - Cancel at timestamp
- `proration_behavior` - Proration behavior
- `payment_behavior` - Payment behavior

### Example Request (Change Plan)
```bash
curl https://api.stripe.com/v1/subscriptions/sub_abc123 \
  -u "sk_test_abc123...:" \
  -d "items[0][id]"=si_existing \
  -d "items[0][price]"=price_new_plan \
  -d proration_behavior=create_prorations
```

### Example Request (Cancel at Period End)
```bash
curl https://api.stripe.com/v1/subscriptions/sub_abc123 \
  -u "sk_test_abc123...:" \
  -d cancel_at_period_end=true
```

### Response (200 OK)
Returns updated `Subscription` object.

---

## Cancel Subscription

### Request
```
DELETE /subscriptions/:id
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface SubscriptionCancel {
  cancellation_details?: {
    comment?: string;
    feedback?: 'reason_not_using' | 'too_expensive' | 'missing_features' | 'switching_service' | 'other';
    reason?: 'cancellation_requested' | 'payment_failed' | 'fraud' | 'other';
  };
  prorate?: boolean;          // Default: true
  invoice_now?: boolean;       // Default: true
}
```

### Example Request
```bash
curl -X DELETE https://api.stripe.com/v1/subscriptions/sub_abc123 \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
```json
{
  "id": "sub_abc123",
  "object": "subscription",
  "status": "canceled",
  "canceled_at": 1679447723,
  "cancellation_details": {
    "comment": null,
    "feedback": null,
    "reason": "cancellation_requested"
  }
}
```

---

## Pause Subscription

### Request
```
POST /subscriptions/:id/pause
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface SubscriptionPause {
  type: 'subscription';       // Required
  bill_for?: {
    unused_time_from?: { type: 'now' };
    outstanding_usage_through?: { type: 'now' };
  };
  invoicing_behavior?: 'pending_invoice_item' | 'invoice_now';
}
```

### Example Request
```bash
curl https://api.stripe.com/v1/subscriptions/sub_abc123/pause \
  -u "sk_test_abc123...:" \
  -d type=subscription
```

### Response (200 OK)
Returns subscription with `status: 'paused'`.

---

## Resume Subscription

### Request
```
POST /subscriptions/:id/resume
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface SubscriptionResume {
  billing_cycle_anchor?: 'now' | number;  // Unix timestamp
}
```

### Example Request
```bash
curl https://api.stripe.com/v1/subscriptions/sub_abc123/resume \
  -u "sk_test_abc123...:" \
  -d billing_cycle_anchor=now
```

### Response (200 OK)
Returns subscription with `status: 'active'`.

---

## List Subscriptions

### Request
```
GET /subscriptions
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface SubscriptionList {
  limit?: number;           // Max: 100, Default: 10
  starting_after?: string;  // Cursor for pagination
  ending_before?: string;   // Cursor for pagination
  customer?: string;         // Filter by customer
  price?: string;           // Filter by price
  status?: SubscriptionStatus;  // Filter by status
  created?: {              // Filter by creation date
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
}
```

### Example Request
```bash
curl -G https://api.stripe.com/v1/subscriptions \
  -u "sk_test_abc123...:" \
  -d customer=cus_abc123 \
  -d status=active \
  -d limit=10
```

---

## Subscription Object Schema

```typescript
interface Subscription {
  id: string;                    // sub_...
  object: 'subscription';
  
  // Status
  status: SubscriptionStatus;
  
  // Customer
  customer: string;              // Customer ID
  
  // Items
  items: {
    object: 'list';
    data: SubscriptionItem[];
    has_more: boolean;
    url: string;
  };
  
  // Plan (deprecated, use items)
  plan: {
    id: string;
    object: 'plan';
    active: boolean;
    amount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
  };
  quantity: number;
  
  // Billing
  billing_cycle_anchor: number;  // Unix timestamp
  collection_method: 'charge_automatically' | 'send_invoice';
  days_until_due: number | null;
  
  // Payment
  default_payment_method: string | null;
  default_source: string | null;
  payment_settings: {
    payment_method_options: Record<string, any>;
    payment_method_types: string[] | null;
    save_default_payment_method: 'on_subscription' | 'off';
  };
  
  // Cancellation
  cancel_at: number | null;      // Unix timestamp
  cancel_at_period_end: boolean;
  canceled_at: number | null;    // Unix timestamp
  cancellation_details: {
    comment: string | null;
    feedback: string | null;
    reason: string | null;
  };
  
  // Trial
  trial_start: number | null;     // Unix timestamp
  trial_end: number | null;       // Unix timestamp
  trial_settings: {
    end_behavior: {
      missing_payment_method: 'cancel' | 'create_invoice';
    };
  };
  
  // Discount
  discount: {
    coupon: Coupon;
    customer: string;
    start: number;
    end: number | null;
  } | null;
  
  // Tax
  automatic_tax: {
    enabled: boolean;
    liability: { account: string } | null;
  };
  default_tax_rates: string[];
  
  // Invoice
  latest_invoice: string | null;
  next_pending_invoice_item_invoice: number | null;
  pending_invoice_item_interval: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
  } | null;
  
  // Pause
  pause_collection: {
    behavior: 'void' | 'mark_uncollectible' | 'keep_as_draft';
    resumes_at: number | null;
  } | null;
  
  // Metadata
  metadata: Record<string, string>;
  description: string | null;
  
  // Application Fee
  application_fee_percent: number | null;
  
  // Transfer
  transfer_data: {
    destination: string;
    amount_percent: number;
  } | null;
  
  // Timestamps
  created: number;              // Unix timestamp
  start_date: number;           // Unix timestamp
  ended_at: number | null;       // Unix timestamp
  livemode: boolean;
  
  // Test Clock
  test_clock: string | null;
}

interface SubscriptionItem {
  id: string;                    // si_...
  object: 'subscription_item';
  billing_thresholds: {
    usage_gte: number;
    reset_billing_cycle_anchor: boolean;
  } | null;
  created: number;
  metadata: Record<string, string>;
  price: Price;
  quantity: number;
  subscription: string;
  tax_rates: string[];
}
```

---

## Subscription Status Values

```typescript
type SubscriptionStatus =
  | 'active'            // Subscription is active
  | 'canceled'          // Subscription canceled
  | 'incomplete'        // First payment failed
  | 'incomplete_expired'// First payment failed, expired
  | 'past_due'          // Payment overdue
  | 'paused'            // Subscription paused
  | 'trialing'          // In trial period
  | 'unpaid';           // Payment failed, not paid
```

| Status | Description |
|--------|-------------|
| `active` | Subscription is active and billing |
| `canceled` | Subscription has been canceled |
| `incomplete` | First payment failed, retry pending |
| `incomplete_expired` | First payment failed, expired (24h) |
| `past_due` | Payment failed, retry in progress |
| `paused` | Subscription paused, no billing |
| `trialing` | In trial period, no charge yet |
| `unpaid` | Payment failed, not paid |

---

## Cloudflare Workers Examples

### Create Subscription
```typescript
interface Env {
  STRIPE_SECRET_KEY: string;
}

async function createSubscription(
  customerId: string,
  priceId: string,
  metadata?: Record<string, string>
): Promise<Subscription> {
  const params = new URLSearchParams({
    customer: customerId,
    'items[0][price]': priceId,
    payment_behavior: 'default_incomplete'
  });
  
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      params.append(`metadata[${key}]`, value);
    }
  }
  
  const response = await fetch('https://api.stripe.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create subscription');
  }
  
  return response.json();
}
```

### Cancel Subscription
```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: 'cancellation_requested' | 'payment_failed' | 'fraud' | 'other'
): Promise<Subscription> {
  const params = new URLSearchParams();
  
  if (reason) {
    params.append('cancellation_details[reason]', reason);
  }
  
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to cancel subscription');
  }
  
  return response.json();
}
```

### Get Customer Subscriptions
```typescript
async function getCustomerSubscriptions(
  customerId: string,
  status?: SubscriptionStatus
): Promise<Subscription[]> {
  const params = new URLSearchParams({
    customer: customerId,
    limit: '100'
  });
  
  if (status) {
    params.append('status', status);
  }
  
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get subscriptions');
  }
  
  const result = await response.json();
  return result.data;
}
```

### Update Subscription Plan
```typescript
async function updateSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Subscription> {
  // First, get the subscription to find the item ID
  const subResponse = await fetch(
    `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!subResponse.ok) {
    const error = await subResponse.json();
    throw new Error(error.error?.message || 'Failed to get subscription');
  }
  
  const subscription = await subResponse.json();
  const itemId = subscription.items.data[0].id;
  
  // Update the subscription
  const params = new URLSearchParams({
    'items[0][id]': itemId,
    'items[0][price]': newPriceId,
    proration_behavior: 'create_prorations'
  });
  
  const updateResponse = await fetch(
    `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    }
  );
  
  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(error.error?.message || 'Failed to update subscription');
  }
  
  return updateResponse.json();
}
```

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `parameter_missing` | Required parameter missing |
| `parameter_invalid` | Invalid parameter value |
| `resource_missing` | Subscription not found |
| `subscription_payment_failed` | Payment failed |
| `subscription_status_incompatible` | Invalid status for operation |

---

## Notes

- **Use Checkout Sessions** for customer-facing subscription creation
- **Payment behavior** controls how failed payments are handled
- **Proration** applies when changing plans mid-cycle
- **Trials** can be set via `trial_period_days` or `trial_end`
- **Cancel at period end** allows subscription to complete current cycle
- **Pause** stops billing but keeps subscription active