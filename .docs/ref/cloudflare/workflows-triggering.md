---
source: Context7 API
library: Cloudflare Workflows
package: cloudflare-workflows
topic: triggering
fetched: 2026-04-18T00:00:00Z
official_docs: https://developers.cloudflare.com/workflows/build/trigger-workflows
when_to_use: When triggering workflows from Workers, managing workflow instances, or checking status
---

# Triggering and Managing Workflows

## Workflow Binding Type

First, define the Workflow binding in your environment type:

```typescript
interface Env {
  // Basic workflow binding
  MY_WORKFLOW: Workflow;
  
  // Typed workflow binding (recommended)
  MY_WORKFLOW: Workflow<UserParams>;
}
```

## Creating/Triggering a Workflow Instance

Use `env.MY_WORKFLOW.create()` to start a new workflow instance.

### Method Signature

```typescript
env.MY_WORKFLOW.create(options?: {
  id?: string;        // Optional custom ID (auto-generated if not provided)
  params?: T;         // Optional parameters to pass to workflow
}): Promise<WorkflowInstance>
```

### Basic Trigger (No Parameters)

```typescript
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // Create a new workflow instance with auto-generated ID
    let instance = await env.MY_WORKFLOW.create();
    
    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  },
};
```

### Trigger with Custom ID

```typescript
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const myIdDefinedFromOtherSystem = crypto.randomUUID();
    
    let instance = await env.MY_WORKFLOW.create({
      id: myIdDefinedFromOtherSystem,
    });
    
    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  },
};
```

### Trigger with Parameters

```typescript
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    let someEvent = { 
      url: req.url, 
      createdTimestamp: Date.now() 
    };
    
    // Trigger workflow with parameters
    let instance = await env.MY_WORKFLOW.create({
      id: crypto.randomUUID(),
      params: someEvent,
    });

    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  },
};
```

### Typed Parameters (TypeScript)

```typescript
interface User {
  email: string;
  createdTimestamp: number;
}

interface Env {
  // Pass type parameter for type-safe params
  MY_WORKFLOW: Workflow<User>;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const user: User = {
      email: "user@example.com",
      createdTimestamp: Date.now()
    };

    // params is now type-checked as User
    let instance = await env.MY_WORKFLOW.create({
      params: user
    });

    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  }
};
```

## Retrieving an Existing Instance

Use `env.MY_WORKFLOW.get()` to retrieve an existing workflow instance by ID.

```typescript
let instance = await env.MY_WORKFLOW.get("abc-123");
```

## WorkflowInstance Methods

Once you have a `WorkflowInstance` (from create or get), you can:

```typescript
// Get current status
let status = await instance.status();

// Pause execution
await instance.pause();

// Resume paused workflow
await instance.resume();

// Restart from beginning
await instance.restart();

// Terminate permanently
await instance.terminate();

// Send event to waiting workflow
await instance.sendEvent({
  type: "stripe-webhook",
  payload: webhookPayload
});
```

## Complete Worker Example

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

interface Env {
  MY_WORKFLOW: Workflow;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const instanceId = url.searchParams.get("instanceId");

    // If an ?instanceId=<id> query parameter is provided, fetch the status
    // of an existing Workflow by its ID.
    if (instanceId) {
      let instance = await env.MY_WORKFLOW.get(instanceId);
      return Response.json({
        status: await instance.status(),
      });
    }

    // Else, create a new instance of our Workflow, passing in any (optional)
    // params and return the ID.
    const newId = crypto.randomUUID();
    let instance = await env.MY_WORKFLOW.create({ 
      id: newId,
      params: { 
        source: 'api',
        timestamp: Date.now(),
        path: url.pathname 
      }
    });
    
    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  },
};
```

## InstanceStatus Type

The `status()` method returns an `InstanceStatus` object:

```typescript
type InstanceStatus = {
  status:
    | "queued"           // Waiting to be started (concurrency limits)
    | "running"          // Currently executing
    | "paused"           // Manually paused
    | "errored"          // Failed with error
    | "terminated"       // User terminated while running
    | "complete"         // Successfully finished
    | "waiting"          // Hibernating (sleep or waitForEvent)
    | "waitingForPause"  // Finishing current work to pause
    | "unknown";
  error?: string;        // Error message if status is 'errored'
  output?: object;      // Return value from run() method if complete
};
```

## Triggering from Scheduled Events (Cron)

```typescript
export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const params = {
      accountId: "{accountId}",
      databaseId: "{databaseId}",
    };
    
    const instance = await env.BACKUP_WORKFLOW.create({ params });
    console.log(`Started workflow: ${instance.id}`);
  },
};
```

## Sending Events to Waiting Workflows

When a workflow is waiting for an event (via `step.waitForEvent`), you can send events:

```typescript
// From a Worker
let instance = await env.MY_WORKFLOW.get("instance-id");
await instance.sendEvent({
  type: "stripe-webhook",
  payload: {
    invoiceId: "inv_123",
    status: "paid",
    amount: 5000
  }
});
```

The event type must match what the workflow is waiting for:

```typescript
// In the workflow
let event = await step.waitForEvent(
  "receive invoice paid webhook from Stripe",
  { type: "stripe-webhook", timeout: "1 hour" },
);
// event now contains the payload sent above
```

## Python Bindings

For Python Workers:

```python
# Create instance
instance = await env.MY_WORKFLOW.create()

# Get existing instance
instance = await env.MY_WORKFLOW.get("abc-123")

# Available methods
await instance.status()
await instance.pause()
await instance.resume()
await instance.restart()
await instance.terminate()
```

## Important Notes

1. **ID Uniqueness**: IDs must be unique within the retention period. Reusing an ID within its retention limit causes an error.
2. **Auto-generated IDs**: If no ID is provided, a UUID is auto-generated.
3. **Params Serialization**: Parameters must be JSON-serializable.
4. **Concurrency Limits**: New instances may be "queued" if concurrency limits are reached.
5. **Event Types**: When using `waitForEvent`, the type must match exactly between `waitForEvent` and `sendEvent`.
