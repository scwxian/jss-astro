# Cloudflare Workflows

Source: https://developers.cloudflare.com/workflows

## Overview

Durable execution engine built on Cloudflare Workers for multi-step applications with automatic retry, state persistence, and long-running tasks.

## Basic Workflow

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";

type Env = {
	MY_WORKFLOW: Workflow;
};

export class MyWorkflow extends WorkflowEntrypoint<Env> {
	async run(event: WorkflowEvent<unknown>, step: WorkflowStep) {
		const result = await step.do("initial work", async () => {
			const resp = await fetch("https://api.example.com/data");
			return await resp.json();
		});

		await step.sleep("wait for processing", "30 seconds");

		await step.do("finalize", async () => {
			console.log("Workflow complete");
		});
	}
}
```

## Step Retries

```typescript
await step.do(
	"risky operation",
	{
		retries: {
			limit: 5,
			delay: "5 seconds",
			backoff: "exponential", // constant | linear | exponential
		},
		timeout: "15 minutes",
	},
	async () => {
		// Step code
	}
);
```

## Sleep Duration

```typescript
// Human-readable
await step.sleep("wait", "30 seconds");
await step.sleep("wait", "1 hour");
await step.sleep("wait", "1 day");

// Or in milliseconds
await step.sleep("wait", 30000);
```

## wrangler.toml Configuration

```toml
[[workflows]]
name = "my-workflow"
binding = "MY_WORKFLOW"
```

## Trigger Workflow

```typescript
const instance = await env.MY_WORKFLOW.create({
	params: { key: "value" },
});
const id = instance.id;
```
