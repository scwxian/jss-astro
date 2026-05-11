---
source: Context7 API
library: Cloudflare Workflows
package: cloudflare-workflows
topic: types
fetched: 2026-04-18T00:00:00Z
official_docs: https://developers.cloudflare.com/workflows/build/workers-api
when_to_use: When needing type definitions for TypeScript development with Workflows
---

# Cloudflare Workflows TypeScript Types

## Core Types

### WorkflowEntrypoint

Base class for defining workflows:

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Implementation
  }
}
```

**Generic Parameters:**
- `Env`: Environment bindings type
- `Params`: Parameters type passed to the workflow

### WorkflowEvent<T>

The event object passed to the `run()` method:

```typescript
export type WorkflowEvent<T> = {
  payload: Readonly<T>;    // Parameters passed when triggering
  timestamp: Date;         // When the workflow was triggered
  instanceId: string;       // Unique instance identifier
};
```

**Usage:**

```typescript
type Params = {
  email: string;
  orderId: string;
};

export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // event.payload is typed as Readonly<Params>
    const email = event.payload.email;
    const orderId = event.payload.orderId;
    
    // event.timestamp is Date
    const triggeredAt = event.timestamp;
    
    // event.instanceId is string
    const id = event.instanceId;
  }
}
```

### WorkflowStep

The step object for defining workflow steps:

```typescript
export interface WorkflowStep {
  do<T>(
    name: string,
    config: WorkflowStepConfig,
    callback: () => Promise<T>
  ): Promise<T>;
  
  do<T>(
    name: string,
    callback: () => Promise<T>
  ): Promise<T>;
  
  sleep(name: string, duration: WorkflowDuration): Promise<void>;
  
  waitForEvent<T>(
    name: string,
    options: {
      type: string;
      timeout?: WorkflowDuration;
    }
  ): Promise<T>;
}
```

### WorkflowStepConfig

Configuration for step retries and timeouts:

```typescript
export type WorkflowStepConfig = {
  retries?: {
    limit: number;                    // Total retry attempts
    delay: string | number;           // Delay between retries
    backoff?: WorkflowBackoff;          // Backoff strategy
  };
  timeout?: string | number;          // Step timeout
};

export type WorkflowBackoff = 'constant' | 'linear' | 'exponential';
export type WorkflowDuration = string | number;
```

### Workflow<T>

The Workflow binding type for environment:

```typescript
export interface Workflow<T = any> {
  create(options?: {
    id?: string;
    params?: T;
  }): Promise<WorkflowInstance>;
  
  get(id: string): Promise<WorkflowInstance>;
}
```

**Usage:**

```typescript
interface UserParams {
  email: string;
  userId: string;
}

interface Env {
  // Untyped workflow
  MY_WORKFLOW: Workflow;
  
  // Typed workflow (recommended)
  TYPED_WORKFLOW: Workflow<UserParams>;
}
```

### WorkflowInstance

Represents a workflow instance:

```typescript
export interface WorkflowInstance {
  id: string;
  
  status(): Promise<InstanceStatus>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  restart(): Promise<void>;
  terminate(): Promise<void>;
  sendEvent(event: {
    type: string;
    payload?: any;
  }): Promise<void>;
}
```

### InstanceStatus

Status returned by `instance.status()`:

```typescript
type InstanceStatus = {
  status:
    | "queued"           // Waiting to start (concurrency limits)
    | "running"          // Currently executing
    | "paused"           // Manually paused
    | "errored"          // Failed with error
    | "terminated"       // User terminated
    | "complete"         // Successfully finished
    | "waiting"          // Hibernating (sleep/waitForEvent)
    | "waitingForPause"  // Finishing work to pause
    | "unknown";
  error?: string;        // Error message if errored
  output?: object;       // Return value from run() if complete
};
```

## Complete Type Definitions Example

```typescript
// types.ts
import { 
  WorkflowEntrypoint, 
  WorkflowStep, 
  WorkflowEvent, 
  Workflow 
} from 'cloudflare:workers';

// Parameters passed to workflow
export interface OrderParams {
  orderId: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

// Environment bindings
export interface Env {
  // Workflow bindings
  ORDER_WORKFLOW: Workflow<OrderParams>;
  EMAIL_WORKFLOW: Workflow<EmailParams>;
  
  // Cloudflare bindings
  DB: D1Database;
  CACHE: KVNamespace;
  BUCKET: R2Bucket;
  
  // Environment variables
  STRIPE_KEY: string;
  SENDGRID_KEY: string;
}

// Email workflow parameters
export interface EmailParams {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Stripe webhook event
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      amount: number;
      status: string;
    };
  };
}
```

```typescript
// workflows/order.ts
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { Env, OrderParams } from '../types';

export class OrderWorkflow extends WorkflowEntrypoint<Env, OrderParams> {
  async run(event: WorkflowEvent<OrderParams>, step: WorkflowStep) {
    const { orderId, customerEmail, items, total } = event.payload;
    
    // Step 1: Validate order
    await step.do('validate order', async () => {
      if (items.length === 0) {
        throw new Error('Order must contain at least one item');
      }
      
      const calculatedTotal = items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );
      
      if (calculatedTotal !== total) {
        throw new Error('Order total mismatch');
      }
    });
    
    // Step 2: Process payment
    const paymentResult = await step.do(
      'process payment',
      {
        retries: {
          limit: 3,
          delay: '5 seconds',
          backoff: 'exponential'
        },
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
    
    // Step 3: Save to database
    await step.do('save order', async () => {
      await this.env.DB.prepare(
        'INSERT INTO orders (id, email, total, payment_id, status) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(orderId, customerEmail, total, paymentResult.id, 'paid')
      .run();
    });
    
    // Step 4: Send confirmation email
    await step.do('send email', async () => {
      await this.env.EMAIL_WORKFLOW.create({
        params: {
          to: customerEmail,
          subject: 'Order Confirmation',
          template: 'order-confirmation',
          data: { orderId, total, items }
        }
      });
    });
    
    // Return order summary
    return {
      orderId,
      paymentId: paymentResult.id,
      status: 'complete',
      timestamp: new Date().toISOString()
    };
  }
}
```

```typescript
// index.ts (Worker entry point)
import { OrderWorkflow } from './workflows/order';
import { Env, OrderParams } from './types';

export { OrderWorkflow };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/orders' && request.method === 'POST') {
      const body = await request.json() as OrderParams;
      
      const instance = await env.ORDER_WORKFLOW.create({
        id: body.orderId,
        params: body
      });
      
      return Response.json({
        success: true,
        orderId: body.orderId,
        instanceId: instance.id,
        status: await instance.status()
      });
    }
    
    if (url.pathname.startsWith('/api/orders/')) {
      const orderId = url.pathname.split('/').pop();
      const instance = await env.ORDER_WORKFLOW.get(orderId!);
      
      return Response.json({
        orderId,
        status: await instance.status()
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
};
```

## Type-Safe Event Waiting

```typescript
export class PaymentWorkflow extends WorkflowEntrypoint<Env, PaymentParams> {
  async run(event: WorkflowEvent<PaymentParams>, step: WorkflowStep) {
    // Create payment intent
    const paymentIntent = await step.do('create intent', async () => {
      // ... create payment intent
      return { id: 'pi_123', clientSecret: 'secret_123' };
    });
    
    // Wait for webhook with typed event
    const webhookEvent = await step.waitForEvent<StripeWebhookEvent>(
      'wait for payment confirmation',
      { 
        type: 'stripe-payment-success',
        timeout: '1 hour'
      }
    );
    
    // webhookEvent is now fully typed as StripeWebhookEvent
    if (webhookEvent.data.object.status === 'succeeded') {
      await step.do('fulfill order', async () => {
        // Fulfill the order
      });
    }
  }
}
```

## Type Imports Summary

```typescript
// Import all workflow types
import { 
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
  Workflow
} from 'cloudflare:workers';

// Import error types
import { NonRetryableError } from 'cloudflare:workflows';

// Import Cloudflare bindings
import { 
  D1Database,
  KVNamespace,
  R2Bucket,
  ExecutionContext,
  ScheduledController
} from '@cloudflare/workers-types';
```

## Best Practices for Types

1. **Define Params interfaces**: Always define explicit parameter types
2. **Use typed Workflows**: `Workflow<Params>` instead of plain `Workflow`
3. **Type event payloads**: Use generics with `step.waitForEvent<T>()`
4. **Export shared types**: Keep types in a separate file for reuse
5. **Use readonly where appropriate**: Event payloads are already `Readonly<T>`
6. **Avoid `any`**: Use strict TypeScript mode and avoid `any` types
