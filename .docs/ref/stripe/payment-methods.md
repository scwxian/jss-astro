# Payment Methods API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment_methods` | Create payment method |
| GET | `/payment_methods/:id` | Retrieve payment method |
| POST | `/payment_methods/:id` | Update payment method |
| GET | `/customers/:id/payment_methods` | List customer's payment methods |
| POST | `/payment_methods/:id/attach` | Attach to customer |
| POST | `/payment_methods/:id/detach` | Detach from customer |

---

## Create Payment Method

### Request
```
POST /payment_methods
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface PaymentMethodCreate {
  type: PaymentMethodType;
  
  // Card
  card?: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  };
  
  // Card (from token)
  card?: {
    token: string;
  };
  
  // Billing Details
  billing_details?: {
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      state?: string;
    };
    email?: string;
    name?: string;
    phone?: string;
  };
  
  // Metadata
  metadata?: Record<string, string>;
  
  // Type-specific data
  us_bank_account?: {
    account_holder_type: 'individual' | 'company';
    routing_number: string;
    account_number: string;
  };
  
  sepa_debit?: {
    iban: string;
  };
  
  au_becs_debit?: {
    account_number: string;
    routing_number: string;
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

### Example Request (Card)
```bash
curl https://api.stripe.com/v1/payment_methods \
  -u "sk_test_abc123...:" \
  -d type=card \
  -d "card[number]"=4242424242424242 \
  -d "card[exp_month]"=12 \
  -d "card[exp_year]"=2025 \
  -d "card[cvc]"=123 \
  -d "billing_details[name]"="John Doe" \
  -d "billing_details[email]"="john@example.com"
```

### Example Request (From Token)
```bash
curl https://api.stripe.com/v1/payment_methods \
  -u "sk_test_abc123...:" \
  -d type=card \
  -d "card[token]"=tok_visa
```

### Response (200 OK)
```json
{
  "id": "pm_1MoGGtLkdIwHu7ixk5CfdiqC",
  "object": "payment_method",
  "billing_details": {
    "address": {
      "city": null,
      "country": null,
      "line1": null,
      "line2": null,
      "postal_code": null,
      "state": null
    },
    "email": "john@example.com",
    "name": "John Doe",
    "phone": null
  },
  "card": {
    "brand": "visa",
    "checks": {
      "address_line1_check": null,
      "address_postal_code_check": null,
      "cvc_check": "pass"
    },
    "country": "US",
    "display_brand": "visa",
    "exp_month": 12,
    "exp_year": 2025,
    "fingerprint": "abc123",
    "funding": "credit",
    "generated_from": null,
    "last4": "4242",
    "networks": {
      "available": ["visa"],
      "preferred": null
    },
    "three_d_secure_usage": {
      "supported": true
    },
    "wallet": null
  },
  "created": 1679447723,
  "customer": null,
  "livemode": false,
  "metadata": {},
  "type": "card"
}
```

---

## Retrieve Payment Method

### Request
```
GET /payment_methods/:id
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl https://api.stripe.com/v1/payment_methods/pm_abc123 \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
Returns full `PaymentMethod` object.

---

## Update Payment Method

### Request
```
POST /payment_methods/:id
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Updatable Fields
- `billing_details` - Billing details
- `card` - Card details (exp_month, exp_year)
- `metadata` - Custom metadata

### Example Request
```bash
curl https://api.stripe.com/v1/payment_methods/pm_abc123 \
  -u "sk_test_abc123...:" \
  -d "billing_details[name]"="John Doe Updated" \
  -d "card[exp_month]"=12 \
  -d "card[exp_year]"=2026
```

### Response (200 OK)
Returns updated `PaymentMethod` object.

---

## Attach Payment Method to Customer

### Request
```
POST /payment_methods/:id/attach
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface PaymentMethodAttach {
  customer: string;          // REQUIRED: Customer ID
}
```

### Example Request
```bash
curl https://api.stripe.com/v1/payment_methods/pm_abc123/attach \
  -u "sk_test_abc123...:" \
  -d customer=cus_xyz789
```

### Response (200 OK)
```json
{
  "id": "pm_abc123",
  "object": "payment_method",
  "customer": "cus_xyz789",
  "type": "card",
  "card": {
    "brand": "visa",
    "last4": "4242",
    "exp_month": 12,
    "exp_year": 2025
  }
}
```

---

## Detach Payment Method from Customer

### Request
```
POST /payment_methods/:id/detach
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl -X POST https://api.stripe.com/v1/payment_methods/pm_abc123/detach \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
```json
{
  "id": "pm_abc123",
  "object": "payment_method",
  "customer": null,
  "type": "card"
}
```

---

## List Customer's Payment Methods

### Request
```
GET /customers/:id/payment_methods
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface PaymentMethodList {
  type: PaymentMethodType;    // REQUIRED: Filter by type
  limit?: number;             // Max: 100, Default: 10
  starting_after?: string;    // Cursor for pagination
  ending_before?: string;     // Cursor for pagination
}
```

### Example Request
```bash
curl -G https://api.stripe.com/v1/customers/cus_xyz789/payment_methods \
  -u "sk_test_abc123...:" \
  -d type=card \
  -d limit=10
```

### Response (200 OK)
```json
{
  "object": "list",
  "data": [
    {
      "id": "pm_abc123",
      "object": "payment_method",
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2025
      },
      "customer": "cus_xyz789",
      "type": "card"
    }
  ],
  "has_more": false,
  "url": "/v1/customers/cus_xyz789/payment_methods"
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
  
  // US Bank Account (if type === 'us_bank_account')
  us_bank_account?: {
    account_holder_type: 'individual' | 'company';
    account_type: 'checking' | 'savings';
    bank_name: string;
    fingerprint: string;
    last4: string;
    routing_number: string;
  };
  
  // SEPA Debit (if type === 'sepa_debit')
  sepa_debit?: {
    bank_code: string;
    branch_code: string;
    country: string;
    fingerprint: string;
    last4: string;
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

## Cloudflare Workers Examples

### Create and Attach Payment Method
```typescript
interface Env {
  STRIPE_SECRET_KEY: string;
}

async function createAndAttachPaymentMethod(
  customerId: string,
  cardDetails: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
    name?: string;
    email?: string;
  }
): Promise<PaymentMethod> {
  // Create payment method
  const createParams = new URLSearchParams({
    type: 'card',
    'card[number]': cardDetails.number,
    'card[exp_month]': cardDetails.exp_month.toString(),
    'card[exp_year]': cardDetails.exp_year.toString(),
    'card[cvc]': cardDetails.cvc
  });
  
  if (cardDetails.name) {
    createParams.append('billing_details[name]', cardDetails.name);
  }
  
  if (cardDetails.email) {
    createParams.append('billing_details[email]', cardDetails.email);
  }
  
  const createResponse = await fetch('https://api.stripe.com/v1/payment_methods', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: createParams
  });
  
  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.error?.message || 'Failed to create payment method');
  }
  
  const paymentMethod = await createResponse.json();
  
  // Attach to customer
  const attachParams = new URLSearchParams({
    customer: customerId
  });
  
  const attachResponse = await fetch(
    `https://api.stripe.com/v1/payment_methods/${paymentMethod.id}/attach`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: attachParams
    }
  );
  
  if (!attachResponse.ok) {
    const error = await attachResponse.json();
    throw new Error(error.error?.message || 'Failed to attach payment method');
  }
  
  return attachResponse.json();
}
```

### Get Customer's Default Payment Method
```typescript
async function getDefaultPaymentMethod(
  customerId: string
): Promise<PaymentMethod | null> {
  // Get customer
  const customerResponse = await fetch(
    `https://api.stripe.com/v1/customers/${customerId}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!customerResponse.ok) {
    const error = await customerResponse.json();
    throw new Error(error.error?.message || 'Failed to get customer');
  }
  
  const customer = await customerResponse.json();
  
  if (!customer.invoice_settings?.default_payment_method) {
    return null;
  }
  
  // Get payment method
  const pmResponse = await fetch(
    `https://api.stripe.com/v1/payment_methods/${customer.invoice_settings.default_payment_method}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!pmResponse.ok) {
    const error = await pmResponse.json();
    throw new Error(error.error?.message || 'Failed to get payment method');
  }
  
  return pmResponse.json();
}
```

### Set Default Payment Method
```typescript
async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Customer> {
  const params = new URLSearchParams({
    'invoice_settings[default_payment_method]': paymentMethodId
  });
  
  const response = await fetch(
    `https://api.stripe.com/v1/customers/${customerId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to set default payment method');
  }
  
  return response.json();
}
```

### List All Customer Cards
```typescript
async function listCustomerCards(customerId: string): Promise<PaymentMethod[]> {
  const params = new URLSearchParams({
    type: 'card',
    limit: '100'
  });
  
  const response = await fetch(
    `https://api.stripe.com/v1/customers/${customerId}/payment_methods?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to list payment methods');
  }
  
  const result = await response.json();
  return result.data;
}
```

### Detach Payment Method
```typescript
async function detachPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
  const response = await fetch(
    `https://api.stripe.com/v1/payment_methods/${paymentMethodId}/detach`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to detach payment method');
  }
  
  return response.json();
}
```

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `parameter_missing` | Required parameter missing |
| `parameter_invalid` | Invalid parameter value |
| `resource_missing` | Payment method not found |
| `invalid_card_number` | Invalid card number |
| `invalid_expiry_month` | Invalid expiry month |
| `invalid_expiry_year` | Invalid expiry year |
| `invalid_cvc` | Invalid CVC |
| `card_declined` | Card declined |
| `insufficient_funds` | Insufficient funds |

---

## Notes

- **Create payment methods** using Elements or Stripe.js on frontend
- **Attach** to customer before using for subscriptions
- **Set default** via `invoice_settings.default_payment_method`
- **Detach** removes from customer but doesn't delete
- **Card tokens** can be converted to payment methods
- **Test cards** have special numbers for testing scenarios