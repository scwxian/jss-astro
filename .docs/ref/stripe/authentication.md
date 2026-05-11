# Authentication

## API Key Authentication

### Overview
All Stripe API requests require a secret API key in the Authorization header.

### Getting API Keys
1. Log in to Stripe Dashboard: https://dashboard.stripe.com/
2. Navigate to **Developers** → **API Keys**
3. Create or copy your API key

### Key Types
| Type | Prefix | Description |
|------|--------|-------------|
| **Test Secret** | `sk_test_` | Development/testing, creates `livemode: false` objects |
| **Live Secret** | `sk_live_` | Production, processes real payments |
| **Test Publishable** | `pk_test_` | Client-side integration (test mode) |
| **Live Publishable** | `pk_live_` | Client-side integration (production) |

### Request Format
```http
GET /v1/customers
Authorization: Bearer sk_test_abc123...
Content-Type: application/x-www-form-urlencoded
Stripe-Version: 2024-10-28.acacia
```

### Example
```typescript
const response = await fetch('https://api.stripe.com/v1/customers', {
  headers: {
    'Authorization': 'Bearer sk_test_abc123...',
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});
```

### Cloudflare Workers Example
```typescript
interface Env {
  STRIPE_SECRET_KEY: string;
}

export async function stripeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = env.STRIPE_SECRET_KEY;
  
  const response = await fetch(
    `https://api.stripe.com/v1${endpoint}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }
  
  return response;
}
```

---

## API Versioning

### Overview
Stripe uses API versioning to ensure backward compatibility.

### Setting API Version
```http
Stripe-Version: 2024-10-28.acacia
```

### Version Format
- Format: `YYYY-MM-DD` with optional extension
- Example: `2024-10-28.acacia`

### Best Practice
Always specify the API version in your requests to ensure consistent behavior:
```typescript
const response = await fetch('https://api.stripe.com/v1/customers', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Stripe-Version': '2024-10-28.acacia'
  }
});
```

---

## Webhook Signature Verification

### Overview
Every webhook POST includes a `Stripe-Signature` header containing a timestamp and signatures. You must verify this signature to ensure the webhook came from Stripe.

### Why Verify?
- **Prevent fraud**: Ensure webhooks come from Stripe
- **Data integrity**: Confirm payload wasn't tampered with
- **Security best practice**: Never trust unverified callbacks

### Signature Header Format
```
Stripe-Signature: t=1619740800,v1=abc123...,v1=def456...
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
    // ... handle other event types
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
  const signature = elements.find(e => e.startsWith('v1='))?.substring(3);
  
  if (!timestamp || !signature) {
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
  
  // Constant-time comparison
  if (computedSignature.length !== signature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < computedSignature.length; i++) {
    result |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  
  return result === 0;
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
  await processWebhook(event);
  
  // Acknowledge
  return new Response('OK', { status: 200 });
}
```

---

## Idempotency Keys

### Overview
Use idempotency keys to safely retry requests without duplicating operations.

### Request Format
```http
POST /v1/checkout/sessions
Idempotency-Key: unique-key-123
Content-Type: application/x-www-form-urlencoded
```

### Example
```typescript
const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Idempotency-Key': `order-${orderId}`
  },
  body: new URLSearchParams({
    'mode': 'payment',
    'success_url': 'https://example.com/success',
    'line_items[0][price]': 'price_abc123',
    'line_items[0][quantity]': '1'
  })
});
```

### Best Practices
- Use unique keys per logical operation
- Store idempotency keys with your orders
- Keys are retained for 24 hours

---

## Security Best Practices

### 1. Store Keys Securely
```typescript
// ❌ NEVER hardcode in source
const apiKey = 'sk_live_abc123...';

// ✅ Use environment variables
const apiKey = process.env.STRIPE_SECRET_KEY;
```

### 2. Use Test Keys in Development
```typescript
const apiKey = env.ENVIRONMENT === 'production'
  ? env.STRIPE_LIVE_KEY
  : env.STRIPE_TEST_KEY;
```

### 3. Verify All Webhooks
```typescript
// ❌ NEVER skip verification
app.post('/webhook', (req, res) => {
  processPayment(req.body);
});

// ✅ Always verify
app.post('/webhook', (req, res) => {
  if (!verifySignature(req.body, req.headers['stripe-signature'])) {
    return res.status(401).send('Invalid signature');
  }
  processPayment(req.body);
});
```

### 4. Use HTTPS for Callbacks
```typescript
// ❌ HTTP (insecure)
"success_url": "http://example.com/success"

// ✅ HTTPS (secure)
"success_url": "https://example.com/success"
```

### 5. Rotate Keys Periodically
- Generate new API keys every 90 days
- Update webhook secrets after rotation
- Revoke old keys after confirming new ones work

### 6. Restrict Key Permissions
- Use restricted keys for specific operations
- Limit access to only required endpoints
- Set IP restrictions when possible

### 7. Log Security Events
```typescript
app.post('/webhook', async (req, res) => {
  const log = {
    timestamp: new Date().toISOString(),
    signature: req.headers['stripe-signature'],
    verified: false,
    eventType: req.body.type,
    objectId: req.body.data?.object?.id
  };
  
  try {
    log.verified = verifySignature(req.body, req.headers['stripe-signature']);
    if (!log.verified) {
      throw new Error('Invalid signature');
    }
    await processWebhook(req.body);
    res.status(200).send('OK');
  } catch (error) {
    log.error = error.message;
    res.status(401).send('Unauthorized');
  } finally {
    await db.securityLogs.create(log);
  }
});
```

---

## Error Handling

### Authentication Errors
| Status | Error | Description |
|--------|-------|-------------|
| 401 | `invalid_api_key` | API key missing or invalid |
| 403 | `permission_denied` | API key lacks permission |
| 404 | `resource_missing` | Resource not found |

### Example Error Response
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid API Key provided: sk_test_abc123...",
    "code": "api_key_expired"
  }
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
# STRIPE_PUBLISHABLE_KEY
```

### .dev.vars (Local Development)
```env
STRIPE_SECRET_KEY=sk_test_abc123...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Setting Secrets
```bash
# Production
wrangler secret put STRIPE_SECRET_KEY

# Preview
wrangler secret put STRIPE_SECRET_KEY --env preview
```

---

## Notes

- **Never expose secret keys** in client-side code
- **Always use HTTPS** for webhook endpoints
- **Verify signatures** on every webhook
- **Use test keys** in development
- **Rotate keys** periodically for security
- **Use idempotency keys** for safe retries