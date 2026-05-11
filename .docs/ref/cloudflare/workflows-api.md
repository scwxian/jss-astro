---
source: Context7 API
library: Cloudflare Workflows
package: cloudflare-workflows
topic: api-reference
fetched: 2026-04-18T00:00:00Z
official_docs: https://developers.cloudflare.com/workflows/build/workers-api
when_to_use: When implementing workflow classes, defining steps, or understanding the core Workflows API
---

# Cloudflare Workflows API Reference

## WorkflowEntrypoint Class

The `WorkflowEntrypoint` class is the base class for defining workflows in Cloudflare Workers.

### Import

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
```

### Basic Class Definition

```typescript
type Env = {
  MY_WORKFLOW: Workflow;
};

type Params = {
  email: string;
  metadata: Record<string, string>;
};

export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Steps here
  }
}
```

### Generic Type Parameters

- `Env`: Environment bindings type (includes Workflow bindings, D1, KV, R2, etc.)
- `Params`: Type for parameters passed when triggering the workflow

### The run() Method

The `run()` method is the entry point for workflow execution. It receives two parameters:

```typescript
async run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<any>
```

**Parameters:**
- `event: WorkflowEvent<Params>` - Contains payload, timestamp, and instanceId
- `step: WorkflowStep` - Provides methods for defining workflow steps

**Return Value:**
- Optional: Can return computed state or results
- Return value is available when querying workflow instance status

### Complete Example with Return Value

```typescript
export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Steps here
    let someComputedState = await step.do("my step", async () => {
      // Process data
      return { processed: true, count: 42 };
    });

    // Optional: return state from our run() method
    return someComputedState;
  }
}
```

## WorkflowStep API

The `WorkflowStep` object provides methods for defining individual steps in your workflow.

### step.do()

Executes a unit of work as a workflow step.

```typescript
step.do<T>(
  name: string,
  config?: WorkflowStepConfig,
  callback: () => Promise<T>
): Promise<T>
```

**Parameters:**
- `name: string` - Descriptive name for the step (shown in dashboard/logs)
- `config?: WorkflowStepConfig` - Optional retry and timeout configuration
- `callback: () => Promise<T>` - The actual work to perform

**Returns:** Promise resolving to the callback's return value

**Basic Usage:**

```typescript
const files = await step.do('my first step', async () => {
  return {
    files: [
      'doc_7392_rev3.pdf',
      'report_x29_final.pdf',
      'memo_2024_05_12.pdf',
    ],
  };
});
```

**With Configuration:**

```typescript
await step.do(
  'make a call to write that could maybe, just might, fail',
  {
    retries: {
      limit: 5,
      delay: '5 second',
      backoff: 'exponential',
    },
    timeout: '15 minutes',
  },
  async () => {
    if (Math.random() > 0.5) {
      throw new Error('API call to $STORAGE_SYSTEM failed');
    }
  },
);
```

### step.sleep()

Pauses workflow execution for a specified duration.

```typescript
step.sleep(name: string, duration: WorkflowDuration): Promise<void>
```

**Parameters:**
- `name: string` - Descriptive name for the sleep step
- `duration: WorkflowDuration` - Duration to sleep (e.g., '1 minute', '30 days', '10 seconds')

**Duration Formats:**
- Human-readable: `'1 minute'`, `'30 days'`, `'10 seconds'`, `'1 hour'`
- Milliseconds: `60000` (number)

**Example:**

```typescript
await step.sleep('wait on something', '1 minute');
await step.sleep('wait 30 days', '30 days');
```

### step.waitForEvent()

Pauses workflow execution until a specific external event is received.

```typescript
step.waitForEvent<T>(
  name: string,
  options: {
    type: string;
    timeout?: WorkflowDuration;
  }
): Promise<T>
```

**Parameters:**
- `name: string` - Descriptive name for the wait step
- `options.type: string` - Event type to listen for (must match sendEvent type)
- `options.timeout?: WorkflowDuration` - Maximum time to wait (default: 24 hours, max: 365 days)

**Returns:** Promise resolving to the event payload when received

**Example:**

```typescript
// JavaScript
export class MyWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    let event = await step.waitForEvent(
      "receive invoice paid webhook from Stripe",
      { type: "stripe-webhook", timeout: "1 hour" },
    );
    // Rest of your Workflow
  }
}

// TypeScript with typed event
export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    let stripeEvent = await step.waitForEvent<IncomingStripeWebhook>(
      "receive invoice paid webhook from Stripe",
      { type: "stripe-webhook", timeout: "1 hour" },
    );
    // stripeEvent is now typed as IncomingStripeWebhook
  }
}
```

## WorkflowStepConfig Type

Configuration options for `step.do()`:

```typescript
export type WorkflowStepConfig = {
  retries?: {
    limit: number;           // Total number of attempts (default: 5)
    delay: string | number;  // Delay between retries (e.g., '10 seconds' or 10000)
    backoff?: WorkflowBackoff; // 'constant' | 'linear' | 'exponential' (default: 'exponential')
  };
  timeout?: string | number; // Step timeout (default: '10 minutes')
};

export type WorkflowBackoff = 'constant' | 'linear' | 'exponential';
export type WorkflowDuration = string | number;
```

**Default Values:**
- `retries.limit`: 5
- `retries.delay`: '10 seconds' (10000ms)
- `retries.backoff`: 'exponential'
- `timeout`: '10 minutes'

**Retry Backoff Strategies:**
- `constant`: Fixed delay between retries
- `linear`: Delay increases linearly (delay * attempt number)
- `exponential`: Delay doubles with each attempt (default)

## Complete Workflow Example

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type Env = {
  MY_WORKFLOW: Workflow;
  BACKUP_BUCKET: R2Bucket;
  D1_REST_API_TOKEN: string;
};

type Params = {
  accountId: string;
  databaseId: string;
};

export class backupWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { accountId, databaseId } = event.payload;

    // Step 1: Initiate backup
    const bookmark = await step.do(
      `Starting backup for ${databaseId}`,
      async () => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.env.D1_REST_API_TOKEN}`,
          },
          body: JSON.stringify({ output_format: 'polling' }),
        });
        const { result } = await res.json() as any;
        
        if (!result?.at_bookmark) throw new Error("Missing `at_bookmark`");
        return result.at_bookmark;
      },
    );

    // Step 2: Wait for backup completion
    await step.do(
      "Check backup status and store it on R2",
      {
        retries: {
          limit: 10,
          delay: '30 seconds',
          backoff: 'exponential',
        },
        timeout: '30 minutes',
      },
      async () => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.env.D1_REST_API_TOKEN}`,
          },
          body: JSON.stringify({ current_bookmark: bookmark }),
        });
        const { result } = await res.json() as any;
        
        if (!result?.signed_url) throw new Error("Missing `signed_url`");
        
        const dumpResponse = await fetch(result.signed_url);
        if (!dumpResponse.ok) throw new Error("Failed to fetch dump file");
        
        await this.env.BACKUP_BUCKET.put(result.filename, dumpResponse.body);
      },
    );

    // Return completion status
    return { success: true, databaseId, timestamp: new Date().toISOString() };
  }
}
```

## Python API (Alternative)

For Python Workers, the API is similar:

```python
from workers import WorkflowEntrypoint

class MyWorkflow(WorkflowEntrypoint):
    async def run(self, event, step):
        # Define step using decorator
        @step.do("my first step")
        async def my_first_step():
            # do some work
            return "Hello World!"
        
        await my_first_step()
        
        # Sleep
        await step.sleep("my-sleep-step", "10 seconds")
```

## Key Points

1. **Step Durability**: Each `step.do()` is durable - if a step fails, it retries according to config
2. **State Persistence**: Workflow state is automatically persisted between steps
3. **Sleep Persistence**: `step.sleep()` persists the workflow state during hibernation
4. **Event Waiting**: `step.waitForEvent()` allows external systems to resume workflows
5. **Return Values**: Values returned from `step.do()` are cached and replayed on retry
6. **Idempotency**: Steps should be idempotent as they may be retried
