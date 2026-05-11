# Webhooks API

## Overview
Webhooks deliver real-time notifications to your server when events occur (e.g., payment successful, subscription created).

---

## Webhook Endpoints

### Create Webhook Endpoint
```
POST /webhook_endpoints
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface WebhookEndpointCreate {
  // REQUIRED
  url: string;                // HTTPS URL to receive webhooks
  enabled_events: string[];   // Event types to receive
  
  // OPTIONAL
  description?: string;       // Description
  metadata?: Record<string, string>;
  api_version?: string;       // Stripe API version
  connect?: boolean;          // Receive Connect webhooks
}
```

### Example Request
```bash
curl https://api.stripe.com/v1/webhook_endpoints \
  -u "sk_test_abc123...:" \
  -d url="https://example.com/webhooks/stripe" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=invoice.paid" \
  -d "enabled_events[]=invoice.payment_failed"
```

### Response (200 OK)
```json
{
  "id": "we_abc123",
  "object": "webhook_endpoint",
  "api_version": "2024-10-28.acacia",
  "application": null,
  "created": 1679447723,
  "description": null,
  "enabled_events": [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed"
  ],
  "livemode": false,
  "metadata": {},
  "status": "enabled",
  "url": "https://example.com/webhooks/stripe"
}
```

---

## Webhook Endpoint Management

### List Webhook Endpoints
```
GET /webhook_endpoints
Authorization: Bearer <secret_key>
```

### Retrieve Webhook Endpoint
```
GET /webhook_endpoints/:id
Authorization: Bearer <secret_key>
```

### Update Webhook Endpoint
```
POST /webhook_endpoints/:id
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Delete Webhook Endpoint
```
DELETE /webhook_endpoints/:id
Authorization: Bearer <secret_key>
```

---

## Signature Verification

### Overview
Every webhook POST includes a `Stripe-Signature` header containing a timestamp and HMAC-SHA256 signature. You must verify this signature to ensure the webhook came from Stripe.

### Why Verify?
- **Prevent fraud**: Ensure webhooks come from Stripe
- **Data integrity**: Confirm payload wasn't tampered with
- **Security best practice**: Never trust unverified callbacks

### Signature Header Format
```
Stripe-Signature: t=1619740800,v1=abc123def456...,v1=789abc123...
```

Components:
- `t` - Unix timestamp
- `v1` - HMAC-SHA256 signature(s)

### Verification Steps

1. **Extract timestamp and signatures**
2. **Prepare signed_payload string**: `t` + `.` + request body
3. **Compute HMAC-SHA256** with endpoint secret
4. **Compare signatures** (constant-time comparison)

### Node.js Implementation
```typescript
import Stripe from 'stripe';

const stripe = new Stripe('sk_test_...');
const endpointSecret = 'whsec_...';

app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.log(`⚠️ Webhook signature verification failed.`, err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Handle checkout session completed
      break;
    case 'customer.subscription.created':
      const subscription = event.data.object;
      // Handle subscription created
      break;
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object;
      // Handle subscription updated
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      // Handle subscription deleted
      break;
    case 'invoice.paid':
      const invoice = event.data.object;
      // Handle invoice paid
      break;
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      // Handle invoice payment failed
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Handle payment intent succeeded
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      // Handle payment method attached
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  // Return a response to acknowledge receipt of the event
  response.json({ received: true });
});
```

### Cloudflare Workers Implementation
```typescript
interface Env {
  STRIPE_WEBHOOK_SECRET: string;
}

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Verify webhook signature
async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  // Parse signature header
  const elements = signatureHeader.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.substring(2);
  const signatures = elements.filter(e => e.startsWith('v1=')).map(e => e.substring(3));
  
  if (!timestamp || signatures.length === 0) {
    return false;
  }
  
  // Check timestamp (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestamp, 10);
  if (Math.abs(now - timestampNum) > 300) { // 5 minutes tolerance
    return false;
  }
  
  // Prepare signed payload
  const signedPayload = `${timestamp}.${payload}`;
  
  // Compute HMAC
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );
  
  // Convert to hex
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Constant-time comparison with all signatures
  for (const signature of signatures) {
    if (computedSignature.length !== signature.length) {
      continue;
    }
    
    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    if (result === 0) {
      return true;
    }
  }
  
  return false;
}

// Complete webhook handler
export async function handleWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  // Get raw body
  const body = await request.text();
  const signature = request.headers.get('Stripe-Signature');
  
  if (!signature) {
    return new Response('Missing signature', { status: 401 });
  }
  
  // Verify signature
  const isValid = await verifyWebhookSignature(
    body,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // Parse payload
  const event = JSON.parse(body);
  
  // Process webhook
  try {
    await processWebhook(event);
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to acknowledge receipt
  }
  
  // Acknowledge
  return new Response('OK', { status: 200 });
}

async function processWebhook(event: any): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

---

## Event Types

### Checkout Events
| Event | Description |
|-------|-------------|
| `checkout.session.completed` | Checkout session completed |
| `checkout.session.expired` | Checkout session expired |
| `checkout.session.async_payment_failed` | Async payment failed |
| `checkout.session.async_payment_succeeded` | Async payment succeeded |

### Customer Events
| Event | Description |
|-------|-------------|
| `customer.created` | Customer created |
| `customer.updated` | Customer updated |
| `customer.deleted` | Customer deleted |
| `customer.source.created` | Payment source created |
| `customer.source.updated` | Payment source updated |
| `customer.source.deleted` | Payment source deleted |

### Subscription Events
| Event | Description |
|-------|-------------|
| `customer.subscription.created` | Subscription created |
| `customer.subscription.updated` | Subscription updated |
| `customer.subscription.deleted` | Subscription canceled |
| `customer.subscription.paused` | Subscription paused |
| `customer.subscription.resumed` | Subscription resumed |
| `customer.subscription.trial_will_end` | Trial ending soon |

### Invoice Events
| Event | Description |
|-------|-------------|
| `invoice.created` | Invoice created |
| `invoice.finalized` | Invoice finalized |
| `invoice.paid` | Invoice paid |
| `invoice.payment_failed` | Invoice payment failed |
| `invoice.payment_action_required` | Payment requires action |
| `invoice.upcoming` | Invoice upcoming |

### Payment Events
| Event | Description |
|-------|-------------|
| `payment_intent.succeeded` | Payment succeeded |
| `payment_intent.payment_failed` | Payment failed |
| `payment_intent.amount_capturable_updated` | Amount capturable updated |
| `payment_intent.canceled` | Payment canceled |

### Payment Method Events
| Event | Description |
|-------|-------------|
| `payment_method.attached` | Payment method attached to customer |
| `payment_method.detached` | Payment method detached from customer |
| `payment_method.updated` | Payment method updated |

### Charge Events
| Event | Description |
|-------|-------------|
| `charge.succeeded` | Charge succeeded |
| `charge.failed` | Charge failed |
| `charge.refunded` | Charge refunded |
| `charge.captured` | Charge captured |
| `charge.dispute.created` | Dispute created |
| `charge.dispute.updated` | Dispute updated |
| `charge.dispute.closed` | Dispute closed |

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

## Webhook Endpoint Object Schema

```typescript
interface WebhookEndpoint {
  id: string;                    // we_...
  object: 'webhook_endpoint';
  
  // URL
  url: string;
  
  // Status
  status: 'enabled' | 'disabled';
  
  // Events
  enabled_events: string[];
  
  // API Version
  api_version: string;
  
  // Application
  application: string | null;
  
  // Connect
  connect: boolean;
  
  // Description
  description: string | null;
  
  // Metadata
  metadata: Record<string, string>;
  
  // Timestamps
  created: number;              // Unix timestamp
  livemode: boolean;
}
```

---

## Delivery Protocol

### Retry Behavior
- **Initial attempt**: Immediate
- **Retries**: Multiple attempts with exponential backoff
- **Timeout**: Stops after several days
- **Success criteria**: HTTP response status code `200-299`

### Ordering Guarantee
Webhooks for the same object are delivered sequentially:
- `customer.subscription.created` before `customer.subscription.updated`
- No `customer.subscription.updated` until all `customer.subscription.created` callbacks delivered

### Idempotency
Same webhook may be delivered multiple times due to network issues. Always:
1. Check if event already processed
2. Use `event.id` as idempotency key
3. Return `200 OK` even for duplicate deliveries

---

## Best Practices

### 1. Respond Quickly
```typescript
// Good: Acknowledge immediately, process async
app.post('/webhook', async (req, res) => {
  // Verify signature first
  if (!verifySignature(req.body, req.headers['stripe-signature'])) {
    return res.status(401).send('Invalid signature');
  }
  
  // Acknowledge immediately
  res.status(200).send('OK');
  
  // Process async
  await processWebhook(req.body);
});
```

### 2. Handle Duplicates
```typescript
async function handleSubscriptionCreated(subscription: any) {
  // Check if already processed
  const existing = await db.subscriptions.findById(subscription.id);
  if (existing) {
    return; // Already processed
  }
  
  // Process subscription
  await db.subscriptions.create({
    id: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    createdAt: new Date(subscription.created * 1000)
  });
}
```

### 3. Log Everything
```typescript
app.post('/webhook', async (req, res) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventId: req.body.id,
    eventType: req.body.type,
    objectId: req.body.data?.object?.id,
    signature: req.headers['stripe-signature'],
    verified: false
  };
  
  try {
    logEntry.verified = verifySignature(req.body, req.headers['stripe-signature']);
    await processWebhook(req.body);
    res.status(200).send('OK');
  } catch (error) {
    logEntry.error = error.message;
    res.status(500).send('Error');
  } finally {
    await db.webhookLogs.create(logEntry);
  }
});
```

### 4. Use Idempotency Keys
```typescript
async function processEvent(event: Event) {
  // Use event ID as idempotency key
  const idempotencyKey = `event_${event.id}`;
  
  // Check if already processed
  const processed = await cache.get(idempotencyKey);
  if (processed) {
    return;
  }
  
  // Process event
  await handleEvent(event);
  
  // Mark as processed (with TTL)
  await cache.set(idempotencyKey, 'true', 86400); // 24 hours
}
```

---

## Environment Configuration

### wrangler.toml
```toml
[vars]
STRIPE_API_VERSION = "2024-10-28.acacia"

# Secrets (set via wrangler secret put)
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
```

### .dev.vars (Local Development)
```env
STRIPE_SECRET_KEY=sk_test_abc123...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Setting Secrets
```bash
# Production
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Preview
wrangler secret put STRIPE_SECRET_KEY --env preview
wrangler secret put STRIPE_WEBHOOK_SECRET --env preview
```

---

## Notes

- **Test vs Live**: Test webhooks only receive test events, and vice versa
- **Endpoint secret**: Each webhook endpoint has its own secret
- **Timestamp tolerance**: Verify timestamp within 5 minutes
- **Constant-time comparison**: Use constant-time comparison for signatures
- **HTTPS required**: Webhook URLs must use HTTPS
- **Return 200 OK**: Always acknowledge receipt even if processing fails