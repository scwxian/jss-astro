# Products & Prices API

## Endpoints Overview

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/products` | Create product |
| GET | `/products/:id` | Retrieve product |
| POST | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| GET | `/products` | List all products |
| GET | `/products/search` | Search products |

### Prices
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/prices` | Create price |
| GET | `/prices/:id` | Retrieve price |
| POST | `/prices/:id` | Update price |
| GET | `/prices` | List all prices |
| GET | `/prices/search` | Search prices |

---

## Create Product

### Request
```
POST /products
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface ProductCreate {
  // REQUIRED
  name: string;              // Product name
  
  // OPTIONAL
  active?: boolean;          // Default: true
  description?: string;      // Product description
  id?: string;               // Custom ID (prefix: prod_)
  images?: string[];         // URLs to product images
  metadata?: Record<string, string>;
  
  // Pricing (create with default price)
  default_price_data?: {
    currency: string;        // ISO 4217 (e.g., "usd")
    unit_amount: number;     // In cents
    recurring?: {
      interval: 'day' | 'week' | 'month' | 'year';
      interval_count?: number;  // Default: 1
    };
    tax_behavior?: 'inclusive' | 'exclusive' | 'unspecified';
  };
  
  // Physical product
  shippable?: boolean;
  package_dimensions?: {
    height: number;
    length: number;
    width: number;
    weight: number;
  };
  
  // Statement descriptor
  statement_descriptor?: string;  // Max 22 chars
  
  // Tax
  tax_code?: string;         // Tax code ID
  
  // Unit label
  unit_label?: string;       // For metered billing
  
  // URL
  url?: string;              // Product URL
}
```

### Example Request (One-Time Product)
```bash
curl https://api.stripe.com/v1/products \
  -u "sk_test_abc123...:" \
  -d name="Generic Product" \
  -d description="250g bag of single-origin beans" \
  -d "default_price_data[currency]"=usd \
  -d "default_price_data[unit_amount]"=4500 \
  -d "metadata[sku]"=COFFEE-250G
```

### Example Request (Subscription Product)
```bash
curl https://api.stripe.com/v1/products \
  -u "sk_test_abc123...:" \
  -d name="Monthly Subscription" \
  -d description="Generic subscription" \
  -d "default_price_data[currency]"=usd \
  -d "default_price_data[unit_amount]"=1999 \
  -d "default_price_data[recurring][interval]"=month \
  -d "metadata[tier]"=premium
```

### Response (200 OK)
```json
{
  "id": "prod_NZP5rEATBlScM9",
  "object": "product",
  "active": true,
  "created": 1679447722,
  "default_price": "price_1MoGGsLkdIwHu7ixA9yHsq2N",
  "description": "250g bag of single-origin beans",
  "images": [],
  "livemode": false,
  "metadata": {
    "sku": "COFFEE-250G"
  },
  "name": "Generic Product",
  "tax_code": null,
  "type": "good",
  "updated": 1679447722,
  "url": null
}
```

---

## Retrieve Product

### Request
```
GET /products/:id
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl https://api.stripe.com/v1/products/prod_NZP5rEATBlScM9 \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
Returns full `Product` object.

---

## Update Product

### Request
```
POST /products/:id
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl https://api.stripe.com/v1/products/prod_NZP5rEATBlScM9 \
  -u "sk_test_abc123...:" \
  -d name="Generic Product (Updated)" \
  -d description="Now with free shipping!"
```

### Response (200 OK)
Returns updated `Product` object.

---

## Delete Product

### Request
```
DELETE /products/:id
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl -X DELETE https://api.stripe.com/v1/products/prod_NZP5rEATBlScM9 \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
```json
{
  "id": "prod_NZP5rEATBlScM9",
  "object": "product",
  "deleted": true
}
```

---

## Create Price

### Request
```
POST /prices
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Request Body
```typescript
interface PriceCreate {
  // REQUIRED
  currency: string;          // ISO 4217 (e.g., "usd")
  
  // REQUIRED (one of)
  product?: string;          // Existing product ID
  product_data?: {
    name: string;            // Product name
    metadata?: Record<string, string>;
  };
  
  // REQUIRED (one of)
  unit_amount?: number;      // Fixed price in cents
  custom_unit_amount?: {
    enabled: boolean;
    minimum?: number;
    maximum?: number;
    preset?: number;
  };
  tiered?: boolean;          // For tiered pricing
  
  // OPTIONAL
  active?: boolean;          // Default: true
  nickname?: string;         // Internal name
  metadata?: Record<string, string>;
  
  // Recurring pricing
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;  // Default: 1
    usage_type?: 'licensed' | 'metered';
    aggregate_usage?: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  };
  
  // Billing scheme
  billing_scheme?: 'per_unit' | 'tiered';
  
  // Tiers (for tiered pricing)
  tiers?: Array<{
    up_to: number | 'inf';
    unit_amount: number;
    flat_amount?: number;
  }>;
  tiers_mode?: 'graduated' | 'volume';
  
  // Tax
  tax_behavior?: 'inclusive' | 'exclusive' | 'unspecified';
  
  // Transform quantity
  transform_quantity?: {
    divide_by: number;
    round: 'up' | 'down';
  };
  
  // Lookup key
  lookup_key?: string;       // For price lookup
}
```

### Example Request (One-Time Price)
```bash
curl https://api.stripe.com/v1/prices \
  -u "sk_test_abc123...:" \
  -d product=prod_NZP5rEATBlScM9 \
  -d unit_amount=4500 \
  -d currency=usd \
  -d nickname="Standard Price"
```

### Example Request (Recurring Price)
```bash
curl https://api.stripe.com/v1/prices \
  -u "sk_test_abc123...:" \
  -d product=prod_NZP5rEATBlScM9 \
  -d unit_amount=1999 \
  -d currency=usd \
  -d "recurring[interval]"=month \
  -d "recurring[interval_count]"=1 \
  -d nickname="Monthly Subscription"
```

### Example Request (Inline Product)
```bash
curl https://api.stripe.com/v1/prices \
  -u "sk_test_abc123...:" \
  -d "product_data[name]"=Generic\ Product \
  -d unit_amount=4500 \
  -d currency=usd
```

### Response (200 OK)
```json
{
  "id": "price_1MoGGsLkdIwHu7ixA9yHsq2N",
  "object": "price",
  "active": true,
  "billing_scheme": "per_unit",
  "created": 1679447722,
  "currency": "usd",
  "custom_unit_amount": null,
  "livemode": false,
  "lookup_key": null,
  "metadata": {},
  "nickname": "Monthly Subscription",
  "product": "prod_NZP5rEATBlScM9",
  "recurring": {
    "aggregate_usage": null,
    "interval": "month",
    "interval_count": 1,
    "usage_type": "licensed"
  },
  "tax_behavior": "unspecified",
  "tiers_mode": null,
  "transform_quantity": null,
  "type": "recurring",
  "unit_amount": 1999,
  "unit_amount_decimal": "1999"
}
```

---

## Retrieve Price

### Request
```
GET /prices/:id
Authorization: Bearer <secret_key>
```

### Example Request
```bash
curl https://api.stripe.com/v1/prices/price_1MoGGsLkdIwHu7ixA9yHsq2N \
  -u "sk_test_abc123...:"
```

### Response (200 OK)
Returns full `Price` object.

---

## Update Price

### Request
```
POST /prices/:id
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <secret_key>
```

### Updatable Fields
- `active` - Archive/unarchive price
- `nickname` - Internal name
- `metadata` - Custom metadata
- `lookup_key` - For price lookup

### Example Request
```bash
curl https://api.stripe.com/v1/prices/price_1MoGGsLkdIwHu7ixA9yHsq2N \
  -u "sk_test_abc123...:" \
  -d active=false \
  -d nickname="Archived Price"
```

### Response (200 OK)
Returns updated `Price` object.

---

## List Products

### Request
```
GET /products
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface ProductList {
  limit?: number;           // Max: 100, Default: 10
  starting_after?: string;  // Cursor for pagination
  ending_before?: string;   // Cursor for pagination
  active?: boolean;         // Filter by active status
  created?: {              // Filter by creation date
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
  ids?: string[];          // Filter by IDs
}
```

### Example Request
```bash
curl -G https://api.stripe.com/v1/products \
  -u "sk_test_abc123...:" \
  -d limit=10 \
  -d active=true
```

---

## List Prices

### Request
```
GET /prices
Authorization: Bearer <secret_key>
```

### Query Parameters
```typescript
interface PriceList {
  limit?: number;           // Max: 100, Default: 10
  starting_after?: string;  // Cursor for pagination
  ending_before?: string;   // Cursor for pagination
  active?: boolean;         // Filter by active status
  product?: string;         // Filter by product ID
  currency?: string;        // Filter by currency
  type?: 'one_time' | 'recurring';  // Filter by type
  recurring?: {
    interval?: 'day' | 'week' | 'month' | 'year';
  };
}
```

### Example Request
```bash
curl -G https://api.stripe.com/v1/prices \
  -u "sk_test_abc123...:" \
  -d limit=10 \
  -d product=prod_NZP5rEATBlScM9 \
  -d type=recurring
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

## Cloudflare Workers Examples

### Create Product with Price
```typescript
interface Env {
  STRIPE_SECRET_KEY: string;
}

async function createProductWithPrice(
  name: string,
  description: string,
  unitAmount: number,
  currency: string = 'usd',
  recurring?: { interval: 'day' | 'week' | 'month' | 'year'; interval_count?: number }
): Promise<{ product: Product; price: Price }> {
  // Create product
  const productParams = new URLSearchParams({
    name,
    description,
    'default_price_data[currency]': currency,
    'default_price_data[unit_amount]': unitAmount.toString()
  });
  
  if (recurring) {
    productParams.append('default_price_data[recurring][interval]', recurring.interval);
    if (recurring.interval_count) {
      productParams.append('default_price_data[recurring][interval_count]', recurring.interval_count.toString());
    }
  }
  
  const productResponse = await fetch('https://api.stripe.com/v1/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: productParams
  });
  
  if (!productResponse.ok) {
    const error = await productResponse.json();
    throw new Error(error.error?.message || 'Failed to create product');
  }
  
  const product = await productResponse.json();
  
  // Get default price
  const priceResponse = await fetch(
    `https://api.stripe.com/v1/prices/${product.default_price}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  const price = await priceResponse.json();
  
  return { product, price };
}
```

### Get Active Prices for Product
```typescript
async function getProductPrices(productId: string): Promise<Price[]> {
  const params = new URLSearchParams({
    product: productId,
    active: 'true',
    limit: '100'
  });
  
  const response = await fetch(
    `https://api.stripe.com/v1/prices?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get prices');
  }
  
  const result = await response.json();
  return result.data;
}
```

### Archive Product
```typescript
async function archiveProduct(productId: string): Promise<Product> {
  const response = await fetch(
    `https://api.stripe.com/v1/products/${productId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ active: 'false' })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to archive product');
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
| `resource_missing` | Product/Price not found |
| `invalid_currency` | Invalid currency code |
| `price_invalid` | Invalid price configuration |

---

## Notes

- **Prices are immutable** - Create new price instead of updating
- **Archive instead of delete** - Set `active: false`
- **Use metadata** to store internal IDs
- **Unit amounts in cents** - `$45.00` = `4500`
- **Default price** - Set via `default_price` or `default_price_data`
- **Recurring prices** - Must specify `interval`