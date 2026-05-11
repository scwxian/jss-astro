# Shared Schemas & Types

## Checkout Session Status

```typescript
type CheckoutSessionStatus =
  | 'open'      // Session active, awaiting payment
  | 'complete'  // Payment successful
  | 'expired';  // Session expired
```

---

## Payment Status

```typescript
type PaymentStatus =
  | 'paid'               // Payment successful
  | 'unpaid'             // Payment pending
  | 'no_payment_required'; // No payment required
```

---

## Subscription Status

```typescript
type SubscriptionStatus =
  | 'active'             // Subscription is active
  | 'canceled'           // Subscription canceled
  | 'incomplete'         // First payment failed
  | 'incomplete_expired' // First payment failed, expired
  | 'past_due'           // Payment overdue
  | 'paused'             // Subscription paused
  | 'trialing'           // In trial period
  | 'unpaid';            // Payment failed, not paid
```

---

## Payment Intent Status

```typescript
type PaymentIntentStatus =
  | 'requires_payment_method'  // Awaiting payment method
  | 'requires_confirmation'    // Awaiting confirmation
  | 'requires_action'          // Requires customer action
  | 'processing'               // Payment processing
  | 'succeeded'                // Payment successful
  | 'canceled'                  // Payment canceled
  | 'failed';                   // Payment failed
```

---

## Invoice Status

```typescript
type InvoiceStatus =
  | 'draft'              // Invoice in draft
  | 'open'               // Invoice open
  | 'paid'               // Invoice paid
  | 'uncollectible'      // Invoice uncollectible
  | 'void';              // Invoice voided
```

---

## Charge Status

```typescript
type ChargeStatus =
  | 'succeeded'   // Charge successful
  | 'pending'      // Charge pending
  | 'failed';       // Charge failed
```

---

## Dispute Status

```typescript
type DisputeStatus =
  | 'warning_needs_response'   // Warning needs response
  | 'warning_under_review'     // Warning under review
  | 'warning_closed'           // Warning closed
  | 'needs_response'           // Dispute needs response
  | 'under_review'             // Dispute under review
  | 'charge_refunded'          // Charge refunded
  | 'won'                      // Dispute won
  | 'lost';                    // Dispute lost
```

---

## Event Types

### Checkout Events
```typescript
type CheckoutEventType =
  | 'checkout.session.completed'
  | 'checkout.session.expired'
  | 'checkout.session.async_payment_succeeded'
  | 'checkout.session.async_payment_failed';
```

### Customer Events
```typescript
type CustomerEventType =
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'customer.source.created'
  | 'customer.source.updated'
  | 'customer.source.deleted';
```

### Subscription Events
```typescript
type SubscriptionEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.paused'
  | 'customer.subscription.resumed'
  | 'customer.subscription.trial_will_end';
```

### Invoice Events
```typescript
type InvoiceEventType =
  | 'invoice.created'
  | 'invoice.finalized'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.payment_action_required'
  | 'invoice.upcoming';
```

### Payment Events
```typescript
type PaymentEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.amount_capturable_updated'
  | 'payment_intent.canceled';
```

### Payment Method Events
```typescript
type PaymentMethodEventType =
  | 'payment_method.attached'
  | 'payment_method.detached'
  | 'payment_method.updated';
```

### Charge Events
```typescript
type ChargeEventType =
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.refunded'
  | 'charge.captured';
```

### Dispute Events
```typescript
type DisputeEventType =
  | 'charge.dispute.created'
  | 'charge.dispute.updated'
  | 'charge.dispute.closed';
```

### All Event Types
```typescript
type EventType =
  | CheckoutEventType
  | CustomerEventType
  | SubscriptionEventType
  | InvoiceEventType
  | PaymentEventType
  | PaymentMethodEventType
  | ChargeEventType
  | DisputeEventType;
```

---

## Payment Method Types

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
  | 'card_present'
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

---

## Card Brands

```typescript
type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'jcb'
  | 'diners'
  | 'unionpay'
  | 'unknown';
```

---

## Currency Codes (ISO 4217)

```typescript
type Currency =
  | 'usd'   // US Dollar
  | 'eur'   // Euro
  | 'gbp'   // British Pound
  | 'jpy'   // Japanese Yen
  | 'cad'   // Canadian Dollar
  | 'aud'   // Australian Dollar
  | 'chf'   // Swiss Franc
  | 'cny'   // Chinese Yuan
  | 'myr'   // Malaysian Ringgit
  | 'sgd'   // Singapore Dollar
  | 'thb'   // Thai Baht
  | 'idr'   // Indonesian Rupiah
  | 'php'   // Philippine Peso
  | 'vnd'   // Vietnamese Dong
  | 'inr'   // Indian Rupee
  | 'krw'   // South Korean Won
  | 'brl'   // Brazilian Real
  | 'mxn'   // Mexican Peso
  | 'nzd'   // New Zealand Dollar
  | 'sek'   // Swedish Krona
  | 'nok'   // Norwegian Krone
  | 'dkk'   // Danish Krone
  | 'hkd'   // Hong Kong Dollar
  | 'twd'   // Taiwan Dollar
  | 'zar';  // South African Rand
```

---

## Country Codes (ISO 3166-1 alpha-2)

```typescript
type CountryCode =
  | 'US'   // United States
  | 'GB'   // United Kingdom
  | 'CA'   // Canada
  | 'AU'   // Australia
  | 'JP'   // Japan
  | 'CN'   // China
  | 'MY'   // Malaysia
  | 'SG'   // Singapore
  | 'TH'   // Thailand
  | 'ID'   // Indonesia
  | 'PH'   // Philippines
  | 'VN'   // Vietnam
  | 'IN'   // India
  | 'KR'   // South Korea
  | 'BR'   // Brazil
  | 'MX'   // Mexico
  | 'NZ'   // New Zealand
  | 'SE'   // Sweden
  | 'NO'   // Norway
  | 'DK'   // Denmark
  | 'HK'   // Hong Kong
  | 'TW';  // Taiwan
```

---

## Interval Types

```typescript
type Interval =
  | 'day'
  | 'week'
  | 'month'
  | 'year';
```

---

## Billing Scheme

```typescript
type BillingScheme =
  | 'per_unit'  // Fixed price per unit
  | 'tiered';    // Tiered pricing
```

---

## Usage Type

```typescript
type UsageType =
  | 'licensed'  // Fixed quantity
  | 'metered';  // Metered usage
```

---

## Collection Method

```typescript
type CollectionMethod =
  | 'charge_automatically'  // Charge automatically
  | 'send_invoice';          // Send invoice
```

---

## Customer Object Schema

```typescript
interface Customer {
  id: string;                    // cus_...
  object: 'customer';
  
  // Contact Information
  email: string | null;
  name: string | null;
  phone: string | null;
  description: string | null;
  
  // Address
  address: Address | null;
  shipping: ShippingAddress | null;
  
  // Balance
  balance: number;               // In cents
  currency: string | null;        // ISO 4217
  
  // Payment
  default_source: string | null;
  invoice_prefix: string;
  invoice_settings: {
    custom_fields: Array<{ name: string; value: string }> | null;
    default_payment_method: string | null;
    footer: string | null;
  };
  
  // Tax
  tax_exempt: 'none' | 'exempt' | 'reverse';
  tax_ids: {
    object: 'list';
    data: Array<{
      id: string;
      object: 'tax_id';
      type: string;
      value: string;
    }>;
  };
  
  // Metadata
  metadata: Record<string, string>;
  
  // Preferences
  preferred_locales: string[];
  
  // Subscriptions
  subscriptions: {
    object: 'list';
    data: Subscription[];
    has_more: boolean;
  };
  
  // Timestamps
  created: number;              // Unix timestamp
  livemode: boolean;
  
  // Status
  delinquent: boolean;          // Has unpaid invoices
}

interface Address {
  city?: string;
  country?: string;
  line1?: string;
  line2?: string;
  postal_code?: string;
  state?: string;
}

interface ShippingAddress {
  name?: string;
  phone?: string;
  address: Address;
}
```

---

## Product Object Schema

```typescript
interface Product {
  id: string;                    // prod_...
  object: 'product';
  
  // Basic Info
  name: string;
  description: string | null;
  active: boolean;
  type: 'good' | 'service';
  
  // Images
  images: string[];
  
  // Default Price
  default_price: string | null;
  
  // Metadata
  metadata: Record<string, string>;
  
  // Physical Product
  shippable: boolean | null;
  package_dimensions: {
    height: number;
    length: number;
    width: number;
    weight: number;
  } | null;
  
  // Statement Descriptor
  statement_descriptor: string | null;
  
  // Tax
  tax_code: string | null;
  
  // Unit Label
  unit_label: string | null;
  
  // URL
  url: string | null;
  
  // Timestamps
  created: number;              // Unix timestamp
  updated: number;              // Unix timestamp
  livemode: boolean;
}
```

---

## Price Object Schema

```typescript
interface Price {
  id: string;                    // price_...
  object: 'price';
  
  // Basic Info
  active: boolean;
  currency: string;              // ISO 4217
  nickname: string | null;
  metadata: Record<string, string>;
  
  // Product
  product: string | null;        // Product ID
  
  // Pricing
  billing_scheme: 'per_unit' | 'tiered';
  unit_amount: number | null;    // In cents
  unit_amount_decimal: string | null;
  custom_unit_amount: {
    enabled: boolean;
    minimum?: number;
    maximum?: number;
    preset?: number;
  } | null;
  
  // Type
  type: 'one_time' | 'recurring';
  
  // Recurring
  recurring: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
    usage_type: 'licensed' | 'metered';
    aggregate_usage?: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  } | null;
  
  // Tiers
  tiers_mode: 'graduated' | 'volume' | null;
  tiers: Array<{
    up_to: number | 'inf';
    unit_amount: number;
    flat_amount?: number;
  }> | null;
  
  // Tax
  tax_behavior: 'inclusive' | 'exclusive' | 'unspecified';
  
  // Transform
  transform_quantity: {
    divide_by: number;
    round: 'up' | 'down';
  } | null;
  
  // Lookup
  lookup_key: string | null;
  
  // Timestamps
  created: number;              // Unix timestamp
  livemode: boolean;
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

## Payment Method Object Schema

```typescript
interface PaymentMethod {
  id: string;                    // pm_...
  object: 'payment_method';
  
  // Type
  type: PaymentMethodType;
  
  // Billing Details
  billing_details: {
    address: {
      city: string | null;
      country: string | null;
      line1: string | null;
      line2: string | null;
      postal_code: string | null;
      state: string | null;
    };
    email: string | null;
    name: string | null;
    phone: string | null;
  };
  
  // Card Details (if type === 'card')
  card?: {
    brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'diners' | 'unionpay';
    checks: {
      address_line1_check: 'pass' | 'fail' | 'unavailable' | 'unchecked' | null;
      address_postal_code_check: 'pass' | 'fail' | 'unavailable' | 'unchecked' | null;
      cvc_check: 'pass' | 'fail' | 'unavailable' | 'unchecked' | null;
    };
    country: string | null;
    display_brand: string;
    exp_month: number;
    exp_year: number;
    fingerprint: string;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
    generated_from: any | null;
    last4: string;
    networks: {
      available: string[];
      preferred: string | null;
    };
    three_d_secure_usage: {
      supported: boolean;
    } | null;
    wallet: {
      type: 'apple_pay' | 'google_pay' | 'link' | 'paypal';
    } | null;
  };
  
  // Customer
  customer: string | null;
  
  // Metadata
  metadata: Record<string, string>;
  
  // Timestamps
  created: number;              // Unix timestamp
  livemode: boolean;
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

## Error Response Schema

```typescript
interface ErrorResponse {
  error: {
    type: 'invalid_request_error' | 'api_error' | 'card_error' | 'idempotency_error';
    message: string;
    code?: string;
    param?: string;
    decline_code?: string;
    doc_url?: string;
  };
}
```

---

## Common Error Codes

### Validation Errors
| Code | Description |
|------|-------------|
| `parameter_missing` | Required parameter missing |
| `parameter_invalid` | Invalid parameter value |
| `parameter_unknown` | Unknown parameter |
| `resource_missing` | Resource not found |
| `invalid_request_error` | Invalid request |

### Card Errors
| Code | Description |
|------|-------------|
| `invalid_card_number` | Invalid card number |
| `invalid_expiry_month` | Invalid expiry month |
| `invalid_expiry_year` | Invalid expiry year |
| `invalid_cvc` | Invalid CVC |
| `card_declined` | Card declined |
| `insufficient_funds` | Insufficient funds |
| `expired_card` | Card expired |
| `lost_card` | Card reported lost |
| `stolen_card` | Card reported stolen |
| `incorrect_number` | Incorrect card number |
| `incorrect_cvc` | Incorrect CVC |
| `processing_error` | Processing error |

### Authentication Errors
| Code | Description |
|------|-------------|
| `invalid_api_key` | Invalid API key |
| `api_key_expired` | API key expired |
| `permission_denied` | Permission denied |
| `rate_limit_exceeded` | Rate limit exceeded |

---

## Pagination Schema

```typescript
interface PaginatedResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  url: string;
}
```

---

## Timestamp Formats

| Field | Format | Example |
|-------|--------|---------|
| `created` | Unix timestamp (seconds) | `1619740800` |
| `updated` | Unix timestamp (seconds) | `1619740800` |
| `expires_at` | Unix timestamp (seconds) | `1619740800` |

---

## Money Amounts

**CRITICAL**: All monetary values are in **cents** (smallest currency unit).

```typescript
// Examples
const amount = 4500;        // $45.00
const tax = 270;            // $2.70
const total = 4770;         // $47.70

// Conversion
const dollars = amount / 100;  // 45.00
const cents = dollars * 100;   // 4500
```

---

## Notes

- **Always use cents** for monetary values
- **Unix timestamps** are in seconds (not milliseconds)
- **ISO 3166-1 alpha-2** for country codes (2-letter)
- **ISO 4217** for currency codes (3-letter)
- **ISO 8601** for dates (YYYY-MM-DD)
- **Event retention** is 30 days