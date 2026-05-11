# Checkout Sessions API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/checkout/sessions` | Create checkout session |
| GET | `/checkout/sessions/:id` | Retrieve session |
| GET | `/checkout/sessions/:id/line_items` | List line items |
| POST | `/checkout/sessions/:id/expire` | Expire session |
| GET | `/checkout/sessions` | List all sessions |

---

## Create Checkout Session

### Request
```
POST /checkout/sessions
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface CheckoutSessionCreate {
  // REQUIRED
  mode: 'payment' | 'setup' | 'subscription';
  success_url: string;        // Redirect URL after success
  
  // OPTIONAL (but recommended)
  cancel_url?: string;        // Redirect URL after cancel
  
  // Line Items (one of line_items or line_items_data)
  line_items?: Array<{
    price?: string;           // Existing price ID
    price_data?: {
      currency: string;
      product?: string;
      product_data?: {
        name: string;
        description?: string;
        images?: string[];
        metadata?: Record<string, string>;
        tax_code?: string;
      };
      unit_amount: number;
      unit_amount_decimal?: string;
      recurring?: {
        interval: 'day' | 'week' | 'month' | 'year';
        interval_count?: number;
      };
      tax_behavior?: 'inclusive' | 'exclusive' | 'unspecified';
    };
    quantity: number;
    adjustable_quantity?: {
      enabled: boolean;
      minimum?: number;
      maximum?: number;
    };
  }>;
  
  // Customer
  customer?: string;          // Existing customer ID
  customer_email?: string;    // Create new customer with email
  customer_creation?: 'always' | 'if_required';
  
  // Payment Methods
  payment_method_types?: Array<PaymentMethodType>;
  
  // Payment Intent (for payment mode)
  payment_intent_data?: {
    capture_method?: 'automatic' | 'manual';
    description?: string;
    metadata?: Record<string, string>;
    statement_descriptor?: string;
    statement_descriptor_suffix?: string;
    transfer_data?: {
      destination: string;
      amount?: number;
    };
  };
  
  // Subscription (for subscription mode)
  subscription_data?: {
    description?: string;
    metadata?: Record<string, string>;
    trial_period_days?: number;
    trial_end?: number;
    default_tax_rates?: string[];
    transfer_data?: {
      destination: string;
    };
  };
  
  // Billing Address
  billing_address_collection?: 'required' | 'auto';
  
  // Shipping Address
  shipping_address_collection?: {
    allowed_countries: string[];  // ISO 3166-1 alpha-2
  };
  shipping_options?: Array<{
    shipping_rate?: string;
    shipping_rate_data?: {
      type: 'fixed_amount';
      fixed_amount: {
        amount: number;
        currency: string;
      };
      display_name: string;
      delivery_estimate?: {
        minimum: { unit: 'business_day' | 'hour'; value: number };
        maximum: { unit: 'business_day' | 'hour'; value: number };
      };
    };
  }>;
  
  // Metadata
  metadata?: Record<string, string>;
  
  // Custom Text
  custom_text?: {
    submit?: { message: string };
    after_submit?: { message: string };
    terms_of_service_acceptance?: { message: string };
  };
  
  // Consent
  consent_collection?: {
    terms_of_service?: 'required' | 'none';
    promotions?: 'required' | 'none';
  };
  
  // Locale
  locale?: 'auto' | 'bg' | 'cs' | 'da' | 'de' | 'el' | 'en' | 'es' | 'et' | 'fi' | 'fr' | 'hu' | 'id' | 'it' | 'ja' | 'ko' | 'lt' | 'lv' | 'ms' | 'mt' | 'nb' | 'nl' | 'pl' | 'pt' | 'ro' | 'ru' | 'sk' | 'sl' | 'sv' | 'th' | 'tr' | 'vi' | 'zh';
  
  // Automatic Tax
  automatic_tax?: {
    enabled: boolean;
    liability?: { account?: string };
  };
  
  // Tax ID Collection
  tax_id_collection?: {
    enabled: boolean;
  };
  
  // Invoice Creation (for payment mode)
  invoice_creation?: {
    enabled: boolean;
    invoice_data?: {
      description?: string;
      footer?: string;
      metadata?: Record<string, string>;
      custom_fields?: Array<{ name: string; value: string }>;
    };
  };
  
  // Phone Number Collection
  phone_number_collection?: {
    enabled: boolean;
  };
  
  // Expires At
  expires_at?: number;        // Unix timestamp (max 24 hours)
  
  // Allow Promotion Codes
  allow_promotion_codes?: boolean;
  
  // Payment Method Options
  payment_method_options?: {
    card?: {
      request_three_d_secure?: 'automatic' | 'any';
    };
    us_bank_account?: {
      verification_method?: 'automatic' | 'instant' | 'microdeposits';
    };
  };
  
  // Setup Intent (for setup mode)
  setup_intent_data?: {
    description?: string;
    metadata?: Record<string, string>;
    on_behalf_of?: string;
  };
}
```

### Payment Method Types
```typescript
type PaymentMethodType =
  | 'ach_credit_transfer'
  | 'ach_debit'
  | 'acss_debit'
  | 'affirm'
  | 'afterpay_clearpay'
  | 'alipay'
  | 'amazon_pay'
  | 'au_becs_debit'
  | 'bacs_debit'
  | 'bancontact'
  | 'blik'
  | 'boleto'
  | 'card'
  | 'cashapp'
  | 'customer_balance'
  | 'eps'
  | 'fpx'
  | 'giropay'
  | 'grabpay'
  | 'ideal'
  | 'interac_present'
  | 'klarna'
  | 'konbini'
  | 'link'
  | 'mobilepay'
  | 'multibanco'
  | 'oxxo'
  | 'p24'
  | 'paynow'
  | 'paypal'
  | 'pix'
  | 'promptpay'
  | 'revolut_pay'
  | 'sepa_debit'
  | 'sofort'
  | 'swish'
  | 'us_bank_account'
  | 'wechat_pay';
```

### Example Request (One-Time Payment)
```bash
curl https://api.stripe.com/v1/checkout/sessions \
  -u "sk_test_abc123...:" \
  -d "line_items[0][price_data][currency]"=usd \
  -d "line_items[0][price_data][product_data][name]"="Generic Product" \
  -d "line_items[0][price_data][unit_amount]"=4500 \
  -d "line_items[0][quantity]"=1 \
  -d mode=payment \
  -d success_url="https://example.com/success?session_id={CHECKOUT_SESSION_ID}" \
  -d cancel_url="https://example.com/cancel"
```

### Example Request (Subscription)
```bash
curl https://api.stripe.com/v1/checkout/sessions \
  -u "sk_test_abc123...:" \
  -d "line_items[0][price]"=price_abc123 \
  -d "line_items[0][quantity]"=1 \
  -d mode=subscription \
  -d customer=cus_xyz789 \
  -d success_url="https://example.com/success?session_id={CHECKOUT_SESSION_ID}" \
  -d cancel_url="https://example.com/cancel"
```

### Example Request (Setup Future Payments)
```bash
curl https://api.stripe.com/v1/checkout/sessions \
  -u "sk_test_abc123...:" \
  -d mode=setup \
  -d customer=cus_xyz789 \
  -d success_url="https://example.com/success?session_id={CHECKOUT_SESSION_ID}" \
  -d cancel_url="https://example.com/cancel"
```

### Response (200 OK)
```json
{
  "id": "cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "object": "checkout.session",
  "after_expiration": null,
  "allow_promotion_codes": null,
  "amount_subtotal": 4500,
  "amount_total": 4500,
  "automatic_tax": {
    "enabled": false,
    "status": null
  },
  "billing_address_collection": null,
  "cancel_url": "https://example.com/cancel",
  "client_reference_id": null,
  "consent": null,
  "consent_collection": null,
  "created": 1679447722,
  "currency": "usd",
  "custom_fields": [],
  "custom_text": null,
  "customer": null,
  "customer_creation": null,
  "customer_details": null,
  "customer_email": null,
  "expires_at": 1679534122,
  "invoice": null,
  "invoice_creation": null,
  "livemode": false,
  "locale": null,
  "metadata": {},
  "mode": "payment",
  "payment_intent": "pi_abc123...",
  "payment_link": null,
  "payment_method_collection": null,
  "payment_method_options": {},
  "payment_method_types": ["card"],
  "payment_status": "unpaid",
  "phone_number_collection": {
    "enabled": false
  },
  "recovered_from": null,
  "setup_intent": null,
  "shipping_address_collection": null,
  "shipping_cost": null,
  "shipping_details": null,
  "shipping_options": [],
  "status": "open",
  "submit_type": null,
  "subscription": null,
  "success_url": "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
  "total_details": {
    "amount_discount": 0,
    "amount_shipping": 0,
    "amount_tax": 0
  },
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

---

## Retrieve Checkout Session

### Request
```
GET /checkout/sessions/:id
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface SessionRetrieve {
  expand?: string[];  // Expand related objects
}
```

### Example Request
```bash
curl https://api.stripe.com/v1/checkout/sessions/cs_test_abc123 \
  -u "sk_test_abc123...:" \
  -d "expand[]"=customer \
  -d "expand[]"=payment_intent
```

### Response (200 OK)
Returns full `Checkout Session` object.

---

## List Line Items

### Request
```
GET /checkout/sessions/:id/line_items
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface LineItemList {
  limit?: number;           // Max: 100, Default: 10
  starting_after?: string;  // Cursor for pagination
  ending_before?: string;   // Cursor for pagination
}
```

### Example Request
```bash
curl -G https://api.stripe.com/v1/checkout/sessions/cs_test_abc123/line_items \
  -u "sk_test_abc123...:" \
  -d limit=10
```

### Response (200 OK)
```json
{
  "object": "list",
  "data": [
    {
      "id": "li_abc123",
      "object": "item",
      "amount_discount": 0,
      "amount_subtotal": 4500,
      "amount_tax": 0,
      "amount_total": 4500,
      "currency": "usd",
      "description": "Generic Product",
      "discounts": [],
      "price": {
        "id": "price_xyz789",
        "object": "price",
        "active": true,
        "currency": "usd",
        "unit_amount": 4500
      },
      "quantity": 1,
      "taxes": []
    }
  ],
  "has_more": false,
  "url": "/v1/checkout/sessions/cs_test_abc123/line_items"
}
```

---

## Expire Checkout Session

### Request
```
POST /checkout/sessions/:id/expire
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl -X POST https://api.stripe.com/v1/checkout/sessions/cs_test_abc123/expire \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
```json
{
  "id": "cs_test_abc123",
  "object": "checkout.session",
  "status": "expired"
}
```

---

## Checkout Session Object Schema

```typescript
interface CheckoutSession {
  id: string;                    // cs_...
  object: 'checkout.session';
  
  // Status
  status: 'open' | 'complete' | 'expired';
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  
  // Mode
  mode: 'payment' | 'setup' | 'subscription';
  
  // URLs
  url: string | null;            // Checkout URL
  success_url: string;
  cancel_url: string | null;
  
  // Amounts
  amount_subtotal: number;       // In cents
  amount_total: number;          // In cents
  currency: string;              // ISO 4217
  
  // Customer
  customer: string | null;        // Customer ID
  customer_details: {
    email: string;
    name: string | null;
    phone: string | null;
    address: Address | null;
    tax_exempt: 'none' | 'exempt' | 'reverse';
    tax_ids: Array<{ type: string; value: string }>;
  } | null;
  customer_email: string | null;
  customer_creation: 'always' | 'if_required' | null;
  
  // Payment
  payment_intent: string | null;  // For payment mode
  payment_method_types: string[];
  payment_method_options: Record<string, any>;
  
  // Subscription
  subscription: string | null;    // For subscription mode
  
  // Setup
  setup_intent: string | null;    // For setup mode
  
  // Invoice
  invoice: string | null;         // For subscription mode
  
  // Shipping
  shipping_address_collection: {
    allowed_countries: string[];
  } | null;
  shipping_cost: {
    shipping_rate: string;
    amount_subtotal: number;
    amount_tax: number;
    amount_total: number;
  } | null;
  shipping_details: {
    name: string;
    address: Address;
  } | null;
  
  // Metadata
  metadata: Record<string, string>;
  custom_fields: Array<{
    key: string;
    label: { type: 'custom'; custom: string };
    type: 'text' | 'numeric' | 'dropdown';
    text?: { value: string };
    numeric?: { value: number };
    dropdown?: { value: string };
    optional: boolean;
  }>;
  custom_text: {
    submit?: { message: string };
    after_submit?: { message: string };
  } | null;
  
  // Tax
  automatic_tax: {
    enabled: boolean;
    status: 'requires_location_inputs' | 'complete' | 'failed' | null;
  };
  tax_id_collection: {
    enabled: boolean;
  };
  
  // Timestamps
  created: number;              // Unix timestamp
  expires_at: number;           // Unix timestamp
  livemode: boolean;
  
  // Total Details
  total_details: {
    amount_discount: number;
    amount_shipping: number;
    amount_tax: number;
  };
}
```

---

## Checkout Session Status Values

| Status | Description |
|--------|-------------|
| `open` | Session active, awaiting payment |
| `complete` | Payment successful |
| `expired` | Session expired |

## Payment Status Values

| Status | Description |
|--------|-------------|
| `paid` | Payment successful |
| `unpaid` | Payment pending |
| `no_payment_required` | No payment required (e.g., free trial) |

---

## Cloudflare Workers Examples

### Create One-Time Checkout Session
```typescript
interface Env {
  STRIPE_SECRET_KEY: string;
}

async function createCheckoutSession(
  lineItems: Array<{
    name: string;
    description?: string;
    amount: number;
    quantity: number;
    currency?: string;
  }>,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<CheckoutSession> {
  const params = new URLSearchParams();
  
  // Add line items
  lineItems.forEach((item, index) => {
    params.append(`line_items[${index}][price_data][currency]`, item.currency || 'usd');
    params.append(`line_items[${index}][price_data][product_data][name]`, item.name);
    if (item.description) {
      params.append(`line_items[${index}][price_data][product_data][description]`, item.description);
    }
    params.append(`line_items[${index}][price_data][unit_amount]`, item.amount.toString());
    params.append(`line_items[${index}][quantity]`, item.quantity.toString());
  });
  
  // Add mode and URLs
  params.append('mode', 'payment');
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  
  // Add metadata
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      params.append(`metadata[${key}]`, value);
    }
  }
  
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create checkout session');
  }
  
  return response.json();
}
```

### Create Subscription Checkout Session
```typescript
async function createSubscriptionCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<CheckoutSession> {
  const params = new URLSearchParams({
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    mode: 'subscription',
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl
  });
  
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      params.append(`metadata[${key}]`, value);
    }
  }
  
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create checkout session');
  }
  
  return response.json();
}
```

### Get Session with Customer
```typescript
async function getSessionWithCustomer(sessionId: string): Promise<{
  session: CheckoutSession;
  customer: Customer | null;
}> {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=customer`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get session');
  }
  
  const session = await response.json();
  
  return {
    session,
    customer: session.customer
  };
}
```

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `parameter_missing` | Required parameter missing |
| `parameter_invalid` | Invalid parameter value |
| `resource_missing` | Session not found |
| `invalid_url` | Invalid success/cancel URL |
| `invalid_request_error` | Invalid request configuration |

---

## Notes

- **Session expires in 24 hours** by default
- **Use `{CHECKOUT_SESSION_ID}`** in success_url for session ID
- **Line items can use existing prices** or create inline
- **Customer is created automatically** if not provided
- **Metadata is limited** to 500 characters total
- **Use setup mode** to save payment method without charge