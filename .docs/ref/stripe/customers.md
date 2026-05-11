# Customers API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/customers` | Create customer |
| GET | `/customers/:id` | Retrieve customer |
| POST | `/customers/:id` | Update customer |
| DELETE | `/customers/:id` | Delete customer |
| GET | `/customers` | List all customers |
| GET | `/customers/search` | Search customers |

---

## Create Customer

### Request
```
POST /customers
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface CustomerCreate {
  // OPTIONAL (but recommended)
  email?: string;              // Customer's email
  name?: string;               // Customer's full name or business name
  phone?: string;              // Customer's phone number
  
  // OPTIONAL
  description?: string;        // Arbitrary string for internal use
  address?: Address;           // Customer's address
  shipping?: ShippingAddress;  // Shipping address
  balance?: number;            // Balance in cents (negative = credit)
  currency?: string;           // Currency for balance (ISO 4217)
  
  // Invoice settings
  invoice_settings?: {
    default_payment_method?: string;
    custom_fields?: Array<{
      name: string;
      value: string;
    }>;
    footer?: string;
  };
  
  // Tax settings
  tax_exempt?: 'none' | 'exempt' | 'reverse';
  tax_ids?: Array<{
    type: string;
    value: string;
  }>;
  
  // Payment methods
  payment_method?: string;     // Attach payment method on creation
  
  // Metadata
  metadata?: Record<string, string>;
  
  // Preferences
  preferred_locales?: string[];  // Preferred languages (ISO 639-1)
}
```

### Address Schema
```typescript
interface Address {
  city?: string;
  country?: string;           // ISO 3166-1 alpha-2
  line1?: string;
  line2?: string;
  postal_code?: string;
  state?: string;
}
```

### Shipping Address Schema
```typescript
interface ShippingAddress {
  name?: string;
  phone?: string;
  address: Address;
}
```

### Example Request
```bash
curl https://api.stripe.com/v1/customers \
  -u "sk_test_abc123...:" \
  -d email="customer@example.com" \
  -d name="John Doe" \
  -d phone="+60123456789" \
  -d "address[line1]"="123 Main Street" \
  -d "address[city]"="Kuala Lumpur" \
  -d "address[country]"="MY" \
  -d "address[postal_code]"="50000" \
  -d "metadata[user_id]"="12345"
```

### Response (200 OK)
```json
{
  "id": "cus_NffrFeUfNV2Hib",
  "object": "customer",
  "address": {
    "city": "Kuala Lumpur",
    "country": "MY",
    "line1": "123 Main Street",
    "postal_code": "50000"
  },
  "balance": 0,
  "created": 1680893993,
  "currency": null,
  "default_source": null,
  "delinquent": false,
  "description": null,
  "email": "customer@example.com",
  "invoice_prefix": "0759376C",
  "invoice_settings": {
    "custom_fields": null,
    "default_payment_method": null,
    "footer": null
  },
  "livemode": false,
  "metadata": {
    "user_id": "12345"
  },
  "name": "John Doe",
  "phone": "+60123456789",
  "preferred_locales": [],
  "shipping": null,
  "tax_exempt": "none"
}
```

---

## Retrieve Customer

### Request
```
GET /customers/:id
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl https://api.stripe.com/v1/customers/cus_NffrFeUfNV2Hib \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
Returns full `Customer` object.

---

## Update Customer

### Request
```
POST /customers/:id
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl https://api.stripe.com/v1/customers/cus_NffrFeUfNV2Hib \
  -u "sk_test_abc123...:" \
  -d name="John Doe Updated" \
  -d phone="+60987654321"
```

### Response (200 OK)
Returns updated `Customer` object.

---

## Delete Customer

### Request
```
DELETE /customers/:id
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl -X DELETE https://api.stripe.com/v1/customers/cus_NffrFeUfNV2Hib \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
```json
{
  "id": "cus_NffrFeUfNV2Hib",
  "object": "customer",
  "deleted": true
}
```

---

## List Customers

### Request
```
GET /customers
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface CustomerList {
  limit?: number;           // Max: 100, Default: 10
  starting_after?: string;  // Cursor for pagination
  ending_before?: string;   // Cursor for pagination
  email?: string;          // Filter by email
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
curl -G https://api.stripe.com/v1/customers \
  -u "sk_test_abc123...:" \
  -d limit=10 \
  -d email="customer@example.com"
```

### Response (200 OK)
```json
{
  "object": "list",
  "data": [
    {
      "id": "cus_NffrFeUfNV2Hib",
      "object": "customer",
      "email": "customer@example.com",
      "name": "John Doe"
    }
  ],
  "has_more": false,
  "url": "/v1/customers"
}
```

---

## Search Customers

### Request
```
GET /customers/search
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface CustomerSearch {
  query: string;            // Search query (required)
  limit?: number;           // Max: 100, Default: 10
  page?: string;            // Cursor for pagination
}
```

### Search Query Syntax
```
name:'John Doe'
email:'customer@example.com'
metadata['user_id']:'12345'
created>1680893993
```

### Example Request
```bash
curl -G https://api.stripe.com/v1/customers/search \
  -u "sk_test_abc123...:" \
  --data-urlencode "query=name:'John Doe' AND metadata['user_id']:'12345'"
```

### Response (200 OK)
```json
{
  "object": "search_result",
  "data": [
    {
      "id": "cus_NffrFeUfNV2Hib",
      "object": "customer",
      "email": "customer@example.com",
      "name": "John Doe"
    }
  ],
  "has_more": false,
  "total_count": 1,
  "url": "/v1/customers/search"
}
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
  currency: string | null;       // ISO 4217
  
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
```

---

## Cloudflare Workers Examples

### Create Customer
```typescript
interface Env {
  STRIPE_SECRET_KEY: string;
}

async function createCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Customer> {
  const params = new URLSearchParams({
    email,
    name,
    ...(metadata && Object.fromEntries(
      Object.entries(metadata).map(([k, v]) => [`metadata[${k}]`, v])
    ))
  });
  
  const response = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create customer');
  }
  
  return response.json();
}
```

### Get or Create Customer
```typescript
async function getOrCreateCustomer(
  email: string,
  name: string,
  userId: string
): Promise<Customer> {
  // Search for existing customer
  const searchParams = new URLSearchParams({
    query: `email:'${email}' AND metadata['user_id']:'${userId}'`,
    limit: '1'
  });
  
  const searchResponse = await fetch(
    `https://api.stripe.com/v1/customers/search?${searchParams}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  const searchResult = await searchResponse.json();
  
  if (searchResult.data.length > 0) {
    return searchResult.data[0];
  }
  
  // Create new customer
  return createCustomer(email, name, { user_id: userId });
}
```

### Update Customer
```typescript
async function updateCustomer(
  customerId: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }
): Promise<Customer> {
  const params = new URLSearchParams();
  
  if (updates.name) params.append('name', updates.name);
  if (updates.email) params.append('email', updates.email);
  if (updates.phone) params.append('phone', updates.phone);
  
  if (updates.metadata) {
    for (const [key, value] of Object.entries(updates.metadata)) {
      params.append(`metadata[${key}]`, value);
    }
  }
  
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
    throw new Error(error.error?.message || 'Failed to update customer');
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
| `resource_missing` | Customer not found |
| `email_invalid` | Invalid email format |
| `invalid_address` | Invalid address format |

---

## Notes

- **Email is recommended** but not required
- **Use metadata** to store internal IDs
- **Search is limited** to last 5 years
- **Balance is in cents** (negative = credit)
- **Delete removes all data** including payment methods