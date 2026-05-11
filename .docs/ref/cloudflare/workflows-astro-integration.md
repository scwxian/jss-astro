---
source: Context7 API + Cloudflare Docs
library: Cloudflare Workflows + Astro
package: cloudflare-workflows-astro
topic: astro-integration
fetched: 2026-04-18T00:00:00Z
official_docs: https://developers.cloudflare.com/pages/framework-guides/astro/
when_to_use: When integrating Cloudflare Workflows with Astro applications
---

# Cloudflare Workflows with Astro Integration

## Overview

Cloudflare Workflows can be integrated with Astro applications deployed to Cloudflare Pages or Workers. This guide covers the specific patterns and considerations for using Workflows in an Astro context.

## Architecture Patterns

### Pattern 1: Separate Workers Project

Keep Workflows in a separate Cloudflare Workers project, triggered via HTTP from Astro:

```
project/
├── astro/                    # Astro frontend (Cloudflare Pages)
│   ├── src/
│   ├── astro.config.mjs
│   └── package.json
└── workflows/                # Workflows Worker
    ├── src/
    │   ├── index.ts
    │   └── workflows/
    ├── wrangler.jsonc
    └── package.json
```

**Astro API Route calling Workflow:**

```typescript
// astro/src/pages/api/orders.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const orderData = await request.json();
  
  // Call the workflows Worker
  const response = await fetch('https://workflows.your-subdomain.workers.dev/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  
  const result = await response.json();
  
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Pattern 2: Astro Hybrid Rendering with Workers

Use Astro's hybrid rendering mode with Cloudflare adapter:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    mode: 'advanced'  // Required for Workers features
  })
});
```

## Astro Configuration for Cloudflare

### astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    mode: 'advanced',
    functionPerRoute: false  // Single Worker for all routes
  }),
  vite: {
    ssr: {
      external: ['cloudflare:workers', 'cloudflare:workflows']
    }
  }
});
```

### wrangler.jsonc (for Astro + Workflows)

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "astro-workflows-app",
  "compatibility_date": "2024-10-22",
  "compatibility_flags": ["nodejs_compat"],
  
  // Pages function configuration
  "pages_build_output_dir": "./dist",
  
  // Workflow bindings
  "workflows": [
    {
      "name": "order-processing",
      "binding": "ORDER_WORKFLOW",
      "class_name": "OrderWorkflow"
    },
    {
      "name": "email-sending",
      "binding": "EMAIL_WORKFLOW",
      "class_name": "EmailWorkflow"
    }
  ],
  
  // Other bindings
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "your-kv-id"
    }
  ],
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "app-database",
      "database_id": "your-db-id"
    }
  ],
  
  "r2_buckets": [
    {
      "binding": "UPLOADS",
      "bucket_name": "user-uploads"
    }
  ]
}
```

## Type Definitions for Astro + Workflows

```typescript
// src/types/workflow-env.d.ts
/// <reference types="@cloudflare/workers-types" />

import { Workflow } from 'cloudflare:workers';

interface OrderParams {
  orderId: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

interface EmailParams {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

declare global {
  interface CloudflareEnv {
    // Workflows
    ORDER_WORKFLOW: Workflow<OrderParams>;
    EMAIL_WORKFLOW: Workflow<EmailParams>;
    
    // Bindings
    DB: D1Database;
    CACHE: KVNamespace;
    UPLOADS: R2Bucket;
    
    // Secrets
    STRIPE_KEY: string;
    SENDGRID_KEY: string;
  }
}

export {};
```

## Astro API Routes with Workflows

### Triggering Workflows from API Routes

```typescript
// src/pages/api/checkout.ts
import type { APIRoute } from 'astro';
import { OrderWorkflow } from '../../workflows/order';

// Export the workflow class for Cloudflare to discover
export { OrderWorkflow };

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  
  try {
    const orderData = await request.json();
    
    // Validate order
    if (!orderData.items || orderData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Order must contain items' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create workflow instance
    const instance = await env.ORDER_WORKFLOW.create({
      id: orderData.orderId || crypto.randomUUID(),
      params: {
        orderId: orderData.orderId,
        customerEmail: orderData.email,
        items: orderData.items,
        total: orderData.total
      }
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderData.orderId,
        workflowId: instance.id,
        status: await instance.status()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Checkout error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process order',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Checking Workflow Status

```typescript
// src/pages/api/orders/[id]/status.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  const env = locals.runtime.env;
  const orderId = params.id;
  
  if (!orderId) {
    return new Response(
      JSON.stringify({ error: 'Order ID required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get workflow instance by order ID
    const instance = await env.ORDER_WORKFLOW.get(orderId);
    const status = await instance.status();
    
    return new Response(
      JSON.stringify({
        orderId,
        status: status.status,
        error: status.error,
        output: status.output
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    // Instance might not exist yet
    return new Response(
      JSON.stringify({ 
        orderId,
        status: 'not_found'
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

## Workflow Definitions in Astro

```typescript
// src/workflows/order.ts
import { 
  WorkflowEntrypoint, 
  WorkflowStep, 
  WorkflowEvent 
} from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';
import type { CloudflareEnv } from '../types/workflow-env';

interface OrderParams {
  orderId: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

export class OrderWorkflow extends WorkflowEntrypoint<CloudflareEnv, OrderParams> {
  async run(event: WorkflowEvent<OrderParams>, step: WorkflowStep) {
    const { orderId, customerEmail, items, total } = event.payload;
    
    // Step 1: Save initial order state
    await step.do('create order record', async () => {
      await this.env.DB.prepare(
        `INSERT INTO orders (id, email, total, status, created_at) 
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(orderId, customerEmail, total, 'processing', new Date().toISOString())
      .run();
    });
    
    // Step 2: Process payment
    const payment = await step.do(
      'process payment',
      {
        retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' },
        timeout: '2 minutes'
      },
      async () => {
        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.env.STRIPE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: total,
            currency: 'usd',
            metadata: { orderId }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Payment failed: ${response.status}`);
        }
        
        return response.json();
      }
    );
    
    // Step 3: Update order status
    await step.do('update order status', async () => {
      await this.env.DB.prepare(
        'UPDATE orders SET status = ?, payment_id = ? WHERE id = ?'
      )
      .bind('paid', payment.id, orderId)
      .run();
    });
    
    // Step 4: Send confirmation email via workflow
    await step.do('trigger email workflow', async () => {
      await this.env.EMAIL_WORKFLOW.create({
        params: {
          to: customerEmail,
          subject: 'Order Confirmation',
          template: 'order-confirmation',
          data: { orderId, total, items }
        }
      });
    });
    
    // Step 5: Cache order completion
    await step.do('cache order', async () => {
      await this.env.CACHE.put(
        `order:${orderId}`,
        JSON.stringify({ 
          status: 'complete', 
          paymentId: payment.id,
          completedAt: new Date().toISOString()
        }),
        { expirationTtl: 86400 }
      );
    });
    
    return {
      orderId,
      paymentId: payment.id,
      status: 'complete'
    };
  }
}
```

## Frontend Integration

### Astro Component Triggering Workflow

```astro
---
// src/components/CheckoutButton.astro
---

<button id="checkout-btn" class="btn-primary">
  Complete Order
</button>

<div id="status" class="hidden"></div>

<script>
  const btn = document.getElementById('checkout-btn');
  const statusDiv = document.getElementById('status');
  
  btn?.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Processing...';
    
    try {
      const orderData = {
        orderId: crypto.randomUUID(),
        email: 'customer@example.com',
        items: [
          { productId: 'prod_1', quantity: 2, price: 2500 }
        ],
        total: 5000
      };
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        statusDiv.textContent = `Order ${result.orderId} is being processed`;
        statusDiv.className = 'success';
        
        // Poll for status
        pollStatus(result.orderId);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.className = 'error';
      btn.disabled = false;
      btn.textContent = 'Try Again';
    }
  });
  
  async function pollStatus(orderId: string) {
    const checkStatus = async () => {
      const response = await fetch(`/api/orders/${orderId}/status`);
      const status = await response.json();
      
      if (status.status === 'complete') {
        statusDiv.textContent = 'Order completed successfully!';
        statusDiv.className = 'success';
        btn.textContent = 'Order Complete';
      } else if (status.status === 'errored') {
        statusDiv.textContent = `Order failed: ${status.error}`;
        statusDiv.className = 'error';
        btn.disabled = false;
        btn.textContent = 'Try Again';
      } else {
        // Still processing, check again in 2 seconds
        statusDiv.textContent = `Status: ${status.status}...`;
        setTimeout(checkStatus, 2000);
      }
    };
    
    checkStatus();
  }
</script>

<style>
  .btn-primary {
    padding: 1rem 2rem;
    background: #0070f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .success { color: green; }
  .error { color: red; }
  .hidden { display: none; }
</style>
```

## Development Workflow

### Local Development

```bash
# Terminal 1: Start Astro dev server
npm run dev

# Terminal 2: Start Workflows locally (if separate)
cd workflows && npx wrangler dev
```

### Build and Deploy

```bash
# Build Astro
npm run build

# Deploy to Cloudflare Pages with Workflows
npx wrangler pages deploy dist
```

## Important Considerations

### 1. Function Per Route

When using `functionPerRoute: true`, each route becomes a separate Worker. Workflows must be defined in a shared location:

```javascript
// astro.config.mjs
export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    mode: 'advanced',
    functionPerRoute: false  // Recommended for Workflows
  })
});
```

### 2. Environment Type Safety

Always type your environment for proper IntelliSense:

```typescript
// src/env.d.ts
/// <reference types="astro/client" />

type CloudflareEnv = import('./types/workflow-env').CloudflareEnv;

declare namespace App {
  interface Locals {
    runtime: {
      env: CloudflareEnv;
    };
  }
}
```

### 3. Workflow Class Export

Workflow classes must be exported from API routes for Cloudflare to discover them:

```typescript
// src/pages/api/checkout.ts
export { OrderWorkflow } from '../../workflows/order';

export const POST: APIRoute = async ({ request, locals }) => {
  // ...
};
```

### 4. Error Handling

Always handle workflow errors gracefully in API routes:

```typescript
try {
  const instance = await env.ORDER_WORKFLOW.create({ params });
  // ...
} catch (error) {
  if (error.message.includes('already exists')) {
    return new Response(
      JSON.stringify({ error: 'Order already processing' }),
      { status: 409 }
    );
  }
  throw error;
}
```

### 5. Testing

Test workflows independently of Astro frontend:

```typescript
// tests/order-workflow.test.ts
import { OrderWorkflow } from '../src/workflows/order';

describe('OrderWorkflow', () => {
  it('should process order successfully', async () => {
    // Test workflow logic
  });
});
```

## Summary

1. **Use hybrid rendering** with Cloudflare adapter for best integration
2. **Export workflow classes** from API routes
3. **Type your environment** for safety
4. **Handle errors gracefully** in API routes
5. **Poll for status** from the frontend for long-running workflows
6. **Consider separate Workers** for complex workflow projects
