---
source: Context7 API
library: Cloudflare Workflows
package: cloudflare-workflows
topic: error-handling
fetched: 2026-04-18T00:00:00Z
official_docs: https://developers.cloudflare.com/workflows/build/sleeping-and-retrying
when_to_use: When implementing error handling, retries, or dealing with failures in workflows
---

# Cloudflare Workflows Error Handling

## Automatic Retry Behavior

By default, Cloudflare Workflows automatically retries failed steps with these settings:

- **Retry Limit**: 5 attempts
- **Delay**: 10 seconds between retries
- **Backoff**: Exponential
- **Timeout**: 10 minutes per step

## NonRetryableError

For errors that should NOT be retried (e.g., authentication failures, invalid input), use `NonRetryableError`.

### Import

```typescript
import { NonRetryableError } from 'cloudflare:workflows';
```

### Usage

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';

export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    await step.do("validate input", async () => {
      if (!event.payload.data) {
        // This will fail immediately without retries
        throw new NonRetryableError("event.payload.data did not contain the expected payload");
      }
    });
  }
}
```

**Use Cases for NonRetryableError:**
- Invalid authentication credentials
- Malformed input data
- Resource not found (404)
- Permission denied (403)
- Business logic violations

## Try-Catch Error Handling

Catch errors within workflow steps to handle failures gracefully:

### Basic Try-Catch

```typescript
await step.do('task', async () => {
  // work to be done
});

try {
  await step.do('non-retryable-task', async () => {
    // work not to be retried
    throw new NonRetryableError('oh no');
  });
} catch (e) {
  console.log(`Step failed: ${e.message}`);
  await step.do('clean-up-task', async () => {
    // Clean up code here
  });
}

// The Workflow will not fail and will continue its execution
await step.do('next-task', async () => {
  // more work to be done
});
```

### Error Handling with Cleanup

```typescript
export class OrderWorkflow extends WorkflowEntrypoint<Env, OrderParams> {
  async run(event: WorkflowEvent<OrderParams>, step: WorkflowStep) {
    let paymentId: string | null = null;
    
    try {
      // Step 1: Create payment intent
      paymentId = await step.do('create payment', async () => {
        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.env.STRIPE_KEY}` },
          body: JSON.stringify({ amount: event.payload.amount })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create payment');
        }
        
        const data = await response.json();
        return data.id;
      });
      
      // Step 2: Process payment
      await step.do('process payment', {
        retries: { limit: 3, delay: '5 seconds' }
      }, async () => {
        // Process the payment
      });
      
    } catch (error) {
      // Cleanup: Cancel the payment intent if it was created
      if (paymentId) {
        await step.do('cleanup payment', async () => {
          await fetch(`https://api.stripe.com/v1/payment_intents/${paymentId}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.env.STRIPE_KEY}` }
          });
        });
      }
      
      // Re-throw if you want the workflow to fail
      // Or handle gracefully and continue
      throw new NonRetryableError(`Order failed: ${error.message}`);
    }
    
    // Continue with order fulfillment
    await step.do('fulfill order', async () => {
      // Fulfill the order
    });
  }
}
```

## Configuring Retries and Timeouts

Customize retry behavior per step:

### Retry Configuration

```typescript
let someState = await step.do(
  "call an API",
  {
    retries: {
      limit: 10,              // Total number of attempts
      delay: "10 seconds",     // Delay between each retry
      backoff: "exponential"   // "constant" | "linear" | "exponential"
    },
    timeout: "30 minutes",     // Maximum time for step execution
  },
  async () => {
    // Step code goes here
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error('API call failed');
    return response.json();
  }
);
```

### Backoff Strategies

1. **constant**: Fixed delay between retries
   ```typescript
   backoff: "constant"
   // Retries at: 10s, 10s, 10s, 10s, 10s
   ```

2. **linear**: Delay increases linearly
   ```typescript
   backoff: "linear"
   // Retries at: 10s, 20s, 30s, 40s, 50s
   ```

3. **exponential**: Delay doubles each time (default)
   ```typescript
   backoff: "exponential"
   // Retries at: 10s, 20s, 40s, 80s, 160s
   ```

### Timeout Formats

```typescript
// Human-readable strings
timeout: "30 seconds"
timeout: "5 minutes"
timeout: "1 hour"
timeout: "30 days"

// Milliseconds
timeout: 30000  // 30 seconds
```

## WorkflowStepConfig Type

Complete type definition for step configuration:

```typescript
export type WorkflowStepConfig = {
  retries?: {
    limit: number;                    // Default: 5
    delay: string | number;             // Default: "10 seconds"
    backoff?: WorkflowBackoff;          // Default: "exponential"
  };
  timeout?: string | number;            // Default: "10 minutes"
};

export type WorkflowBackoff = 'constant' | 'linear' | 'exponential';
```

## Error Handling Patterns

### Pattern 1: Fail Fast with NonRetryableError

```typescript
await step.do('validate webhook', async () => {
  const signature = event.payload.headers['stripe-signature'];
  
  if (!verifyStripeSignature(signature, event.payload.body)) {
    // Don't retry - signature will never be valid
    throw new NonRetryableError('Invalid webhook signature');
  }
});
```

### Pattern 2: Retry with Fallback

```typescript
let result;
try {
  result = await step.do(
    'call primary API',
    { retries: { limit: 3, delay: '1 second' } },
    async () => {
      const res = await fetch('https://primary-api.example.com');
      if (!res.ok) throw new Error('Primary API failed');
      return res.json();
    }
  );
} catch (error) {
  // Fallback to secondary API
  result = await step.do('call fallback API', async () => {
    const res = await fetch('https://fallback-api.example.com');
    return res.json();
  });
}
```

### Pattern 3: Conditional Retry Logic

```typescript
await step.do(
  'process with conditional retry',
  {
    retries: {
      limit: 5,
      delay: '5 seconds',
      backoff: 'exponential'
    }
  },
  async () => {
    const response = await fetch('https://api.example.com/process');
    
    if (response.status === 429) {
      // Rate limited - retry is appropriate
      throw new Error('Rate limited');
    }
    
    if (response.status === 400) {
      // Bad request - don't retry
      throw new NonRetryableError('Invalid request payload');
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  }
);
```

### Pattern 4: Saga Pattern (Compensating Transactions)

```typescript
export class SagaWorkflow extends WorkflowEntrypoint<Env, OrderParams> {
  async run(event: WorkflowEvent<OrderParams>, step: WorkflowStep) {
    const compensations: Array<() => Promise<void>> = [];
    
    try {
      // Step 1: Reserve inventory
      const reservationId = await step.do('reserve inventory', async () => {
        const id = await reserveInventory(event.payload.items);
        compensations.push(async () => await releaseInventory(id));
        return id;
      });
      
      // Step 2: Charge payment
      const chargeId = await step.do('charge payment', async () => {
        const id = await chargePayment(event.payload.paymentMethod, event.payload.total);
        compensations.push(async () => await refundPayment(id));
        return id;
      });
      
      // Step 3: Create shipment
      await step.do('create shipment', async () => {
        await createShipment(event.payload.address, reservationId);
      });
      
    } catch (error) {
      // Execute compensations in reverse order
      await step.do('execute compensations', async () => {
        for (const compensate of compensations.reverse()) {
          try {
            await compensate();
          } catch (compError) {
            console.error('Compensation failed:', compError);
            // Log for manual intervention
          }
        }
      });
      
      throw new NonRetryableError(`Saga failed: ${error.message}`);
    }
  }
}
```

## Monitoring Failed Workflows

Check workflow status to identify failures:

```typescript
const status = await instance.status();

if (status.status === 'errored') {
  console.error('Workflow failed:', status.error);
  // Alert, log, or handle the error
}
```

## Best Practices

1. **Use NonRetryableError for terminal failures**: Don't waste retries on errors that will never succeed
2. **Set appropriate timeouts**: Long-running operations need longer timeouts
3. **Implement cleanup**: Use try-catch to clean up partial state on failure
4. **Log errors**: Include context in error messages for debugging
5. **Monitor status**: Regularly check workflow statuses for failures
6. **Test failure scenarios**: Ensure your error handling works as expected
7. **Use idempotent operations**: Steps may be retried, so ensure they're safe to run multiple times
