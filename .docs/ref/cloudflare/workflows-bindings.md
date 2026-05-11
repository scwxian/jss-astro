---
source: Context7 API
library: Cloudflare Workflows
package: cloudflare-workflows
topic: bindings-integration
fetched: 2026-04-18T00:00:00Z
official_docs: https://developers.cloudflare.com/workflows/examples/backup-d1
when_to_use: When integrating workflows with D1, KV, R2, or other Cloudflare services
---

# Cloudflare Workflows Bindings Integration

## Accessing Bindings in Workflows

Workflows can access all Cloudflare bindings through `this.env`:

```typescript
export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Access bindings via this.env
    await this.env.DB.prepare('SELECT * FROM users').all();
    await this.env.CACHE.put('key', 'value');
    await this.env.BUCKET.put('file.txt', 'content');
  }
}
```

## D1 Database Integration

### Configuration

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-database",
      "database_id": "your-database-id"
    }
  ]
}
```

### Type Definition

```typescript
interface Env {
  DB: D1Database;
}
```

### Usage in Workflow

```typescript
export class UserWorkflow extends WorkflowEntrypoint<Env, UserParams> {
  async run(event: WorkflowEvent<UserParams>, step: WorkflowStep) {
    // Query database
    const user = await step.do('fetch user', async () => {
      const result = await this.env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      )
      .bind(event.payload.userId)
      .first();
      
      if (!result) {
        throw new NonRetryableError('User not found');
      }
      
      return result;
    });
    
    // Update database
    await step.do('update user', async () => {
      await this.env.DB.prepare(
        'UPDATE users SET last_login = ? WHERE id = ?'
      )
      .bind(new Date().toISOString(), event.payload.userId)
      .run();
    });
  }
}
```

## KV Namespace Integration

### Configuration

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "your-kv-namespace-id"
    }
  ]
}
```

### Type Definition

```typescript
interface Env {
  CACHE: KVNamespace;
}
```

### Usage in Workflow

```typescript
export class CacheWorkflow extends WorkflowEntrypoint<Env, CacheParams> {
  async run(event: WorkflowEvent<CacheParams>, step: WorkflowStep) {
    // Check cache first
    const cached = await step.do('check cache', async () => {
      return await this.env.CACHE.get(`data:${event.payload.id}`);
    });
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fetch fresh data
    const data = await step.do('fetch data', async () => {
      const response = await fetch(`https://api.example.com/data/${event.payload.id}`);
      return await response.json();
    });
    
    // Store in cache
    await step.do('store cache', async () => {
      await this.env.CACHE.put(
        `data:${event.payload.id}`,
        JSON.stringify(data),
        { expirationTtl: 3600 } // 1 hour
      );
    });
    
    return data;
  }
}
```

## R2 Bucket Integration

### Configuration

```jsonc
{
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "my-bucket"
    }
  ]
}
```

### Type Definition

```typescript
interface Env {
  BUCKET: R2Bucket;
}
```

### D1 Backup Workflow Example

```typescript
import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";

type Env = {
  BACKUP_WORKFLOW: Workflow;
  D1_REST_API_TOKEN: string;
  BACKUP_BUCKET: R2Bucket;
};

type Params = {
  accountId: string;
  databaseId: string;
};

export class backupWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { accountId, databaseId } = event.payload;

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;
    const method = "POST";
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Authorization", `Bearer ${this.env.D1_REST_API_TOKEN}`);

    // Step 1: Initiate backup
    const bookmark = await step.do(
      `Starting backup for ${databaseId}`,
      async () => {
        const payload = { output_format: "polling" };

        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(payload),
        });
        const { result } = (await res.json()) as any;

        // If we don't get `at_bookmark` we throw to retry the step
        if (!result?.at_bookmark) throw new Error("Missing `at_bookmark`");

        return result.at_bookmark;
      },
    );

    // Step 2: Check status and store to R2
    await step.do("Check backup status and store it on R2", async () => {
      const payload = { current_bookmark: bookmark };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const { result } = (await res.json()) as any;

      // The endpoint sends `signed_url` when the backup is ready
      if (!result?.signed_url) throw new Error("Missing `signed_url`");

      const dumpResponse = await fetch(result.signed_url);
      if (!dumpResponse.ok) throw new Error("Failed to fetch dump file");

      // Stream the file directly to R2
      await this.env.BACKUP_BUCKET.put(result.filename, dumpResponse.body);
    });
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    return new Response("Not found", { status: 404 });
  },
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const params: Params = {
      accountId: "{accountId}",
      databaseId: "{databaseId}",
    };
    const instance = await env.BACKUP_WORKFLOW.create({ params });
    console.log(`Started workflow: ${instance.id}`);
  },
};
```

## Environment Variables

### Configuration

```jsonc
{
  "vars": {
    "API_ENDPOINT": "https://api.example.com",
    "MAX_RETRIES": "5"
  }
}
```

### Usage in Workflow

```typescript
interface Env {
  API_ENDPOINT: string;
  MAX_RETRIES: string;
  SECRET_KEY: string;  // From wrangler secret put
}

export class ApiWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const apiUrl = this.env.API_ENDPOINT;
    const maxRetries = parseInt(this.env.MAX_RETRIES);
    
    await step.do('call api', {
      retries: { limit: maxRetries }
    }, async () => {
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.env.SECRET_KEY}`
        }
      });
      
      if (!response.ok) throw new Error('API call failed');
      return response.json();
    });
  }
}
```

## Workers AI Integration

### Configuration

```jsonc
{
  "ai": {
    "binding": "AI"
  }
}
```

### Usage in Workflow

```typescript
interface Env {
  AI: Ai;
}

export class AiWorkflow extends WorkflowEntrypoint<Env, AiParams> {
  async run(event: WorkflowEvent<AiParams>, step: WorkflowStep) {
    const result = await step.do('generate content', async () => {
      const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: event.payload.prompt }
        ]
      });
      
      return response;
    });
    
    // Store result
    await step.do('save result', async () => {
      await this.env.DB.prepare(
        'INSERT INTO ai_generations (prompt, result) VALUES (?, ?)'
      )
      .bind(event.payload.prompt, JSON.stringify(result))
      .run();
    });
  }
}
```

## Service Bindings (Worker-to-Worker)

### Configuration

```jsonc
{
  "services": [
    {
      "binding": "USER_SERVICE",
      "service": "user-worker"
    }
  ]
}
```

### Usage in Workflow

```typescript
interface Env {
  USER_SERVICE: Fetcher;
}

export class OrchestrationWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Call another Worker
    const userData = await step.do('fetch user', async () => {
      const response = await this.env.USER_SERVICE.fetch(
        `https://internal/users/${event.payload.userId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      return response.json();
    });
    
    // Continue with user data
    await step.do('process user', async () => {
      // Process the user data
    });
  }
}
```

## Queue Integration

### Configuration

```jsonc
{
  "queues": {
    "producers": [
      {
        "binding": "NOTIFICATION_QUEUE",
        "queue": "notifications"
      }
    ]
  }
}
```

### Usage in Workflow

```typescript
interface Env {
  NOTIFICATION_QUEUE: Queue;
}

export class OrderWorkflow extends WorkflowEntrypoint<Env, OrderParams> {
  async run(event: WorkflowEvent<OrderParams>, step: WorkflowStep) {
    // Process order
    const order = await step.do('process order', async () => {
      // Order processing logic
      return { orderId: event.payload.orderId, status: 'confirmed' };
    });
    
    // Queue notification
    await step.do('queue notification', async () => {
      await this.env.NOTIFICATION_QUEUE.send({
        type: 'order_confirmed',
        orderId: order.orderId,
        email: event.payload.customerEmail
      });
    });
  }
}
```

## Complete Multi-Binding Example

```typescript
// types.ts
interface Env {
  // Workflows
  ORDER_WORKFLOW: Workflow<OrderParams>;
  
  // Database
  DB: D1Database;
  
  // Cache
  CACHE: KVNamespace;
  
  // Storage
  INVOICE_BUCKET: R2Bucket;
  
  // AI
  AI: Ai;
  
  // External services
  STRIPE_API_KEY: string;
  SENDGRID_API_KEY: string;
}

interface OrderParams {
  orderId: string;
  customerEmail: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}
```

```typescript
// workflows/order.ts
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';
import { Env, OrderParams } from '../types';

export class OrderWorkflow extends WorkflowEntrypoint<Env, OrderParams> {
  async run(event: WorkflowEvent<OrderParams>, step: WorkflowStep) {
    const { orderId, customerEmail, items, total } = event.payload;
    
    // 1. Check cache for existing order
    const cached = await step.do('check cache', async () => {
      return await this.env.CACHE.get(`order:${orderId}`);
    });
    
    if (cached) {
      throw new NonRetryableError('Order already processed');
    }
    
    // 2. Validate inventory
    await step.do('validate inventory', async () => {
      for (const item of items) {
        const result = await this.env.DB.prepare(
          'SELECT stock FROM products WHERE id = ?'
        )
        .bind(item.productId)
        .first<{ stock: number }>();
        
        if (!result || result.stock < item.quantity) {
          throw new NonRetryableError(`Insufficient stock for product ${item.productId}`);
        }
      }
    });
    
    // 3. Process payment
    const payment = await step.do(
      'process payment',
      {
        retries: { limit: 3, delay: '5 seconds' },
        timeout: '2 minutes'
      },
      async () => {
        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.env.STRIPE_API_KEY}`,
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
    
    // 4. Update inventory
    await step.do('update inventory', async () => {
      for (const item of items) {
        await this.env.DB.prepare(
          'UPDATE products SET stock = stock - ? WHERE id = ?'
        )
        .bind(item.quantity, item.productId)
        .run();
      }
    });
    
    // 5. Save order
    await step.do('save order', async () => {
      await this.env.DB.prepare(
        'INSERT INTO orders (id, email, total, payment_id, status) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(orderId, customerEmail, total, payment.id, 'paid')
      .run();
    });
    
    // 6. Generate invoice with AI
    const invoice = await step.do('generate invoice', async () => {
      const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          {
            role: 'system',
            content: 'Generate a professional invoice text'
          },
          {
            role: 'user',
            content: `Order ${orderId}, Total: $${total / 100}, Items: ${items.length}`
          }
        ]
      });
      
      return response.response;
    });
    
    // 7. Store invoice in R2
    await step.do('store invoice', async () => {
      await this.env.INVOICE_BUCKET.put(
        `invoices/${orderId}.txt`,
        invoice
      );
    });
    
    // 8. Cache order status
    await step.do('cache order', async () => {
      await this.env.CACHE.put(
        `order:${orderId}`,
        JSON.stringify({ status: 'complete', paymentId: payment.id }),
        { expirationTtl: 86400 } // 24 hours
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

## Best Practices

1. **Use transactions**: Group related database operations in single steps
2. **Cache expensive operations**: Use KV to cache API responses
3. **Store large data in R2**: Don't store large files in D1 or KV
4. **Use secrets for API keys**: Never hardcode credentials
5. **Handle binding failures**: Wrap binding calls in try-catch
6. **Monitor binding quotas**: Be aware of rate limits
7. **Use appropriate retry configs**: Different bindings need different retry strategies
