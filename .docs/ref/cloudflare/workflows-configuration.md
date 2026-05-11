---
source: Context7 API
library: Cloudflare Workflows
package: cloudflare-workflows
topic: configuration
fetched: 2026-04-18T00:00:00Z
official_docs: https://developers.cloudflare.com/workflows/build/workers-api
when_to_use: When configuring workflows in wrangler.toml or wrangler.jsonc
---

# Cloudflare Workflows Configuration

## wrangler.jsonc Configuration

The recommended configuration format for Cloudflare Workflows projects.

### Basic Configuration

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "workflows-starter",
  "main": "src/index.ts",
  "compatibility_date": "2024-10-22",
  "workflows": [
    {
      "name": "workflows-starter",
      "binding": "MY_WORKFLOW",
      "class_name": "MyWorkflow"
    }
  ]
}
```

### Complete Configuration with Multiple Bindings

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "workflows-waitforevent",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-14",
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },
  "ai": {
    "binding": "AI"
  },
  "workflows": [
    {
      "name": "workflows-starter",
      "binding": "MY_WORKFLOW",
      "class_name": "MyWorkflow"
    }
  ],
  "r2_buckets": [
    {
      "bucket_name": "workflow-demo",
      "binding": "workflow_demo_bucket"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "workflows-demo-d1",
      "database_id": "66e4fbe9-06ac-4548-abba-2dc42088e13a"
    }
  ]
}
```

### D1 Backup Workflow Configuration

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "backup-d1",
  "main": "src/index.ts",
  "compatibility_date": "2024-12-27",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "workflows": [
    {
      "name": "backup-workflow",
      "binding": "BACKUP_WORKFLOW",
      "class_name": "backupWorkflow"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BACKUP_BUCKET",
      "bucket_name": "d1-backups"
    }
  ],
  "triggers": {
    "crons": [
      "0 0 * * *"
    ]
  }
}
```

## wrangler.toml Configuration

Alternative TOML format for configuration.

### Basic Configuration

```toml
name = "workflows-starter"
main = "src/index.ts"
compatibility_date = "2024-10-22"

[[workflows]]
# The name of the Workflow
name = "workflows-starter"
# The binding name, which must be a valid JavaScript variable name
# This will be how you call (run) your Workflow from other Workers
binding = "MY_WORKFLOW"
# Must match the class defined in your code that extends WorkflowEntrypoint
class_name = "MyWorkflow"
```

### Complete Configuration

```toml
name = "backup-d1"
main = "src/index.ts"
compatibility_date = "2024-12-27"
compatibility_flags = [ "nodejs_compat" ]

[[workflows]]
name = "backup-workflow"
binding = "BACKUP_WORKFLOW"
class_name = "backupWorkflow"

[[r2_buckets]]
binding = "BACKUP_BUCKET"
bucket_name = "d1-backups"

[triggers]
crons = [ "0 0 * * *" ]
```

## Configuration Fields Reference

### Workflow Binding Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | The name of the workflow (must be unique in your account) |
| `binding` | string | Yes | The JavaScript variable name to access the workflow (e.g., `env.MY_WORKFLOW`) |
| `class_name` | string | Yes | The TypeScript/JavaScript class name that extends `WorkflowEntrypoint` |

### Environment Variables

Add environment variables for use in workflows:

```jsonc
{
  "vars": {
    "API_KEY": "your-api-key",
    "WEBHOOK_SECRET": "your-webhook-secret"
  }
}
```

```toml
[vars]
API_KEY = "your-api-key"
WEBHOOK_SECRET = "your-webhook-secret"
```

### Secrets

Use `wrangler secret put` for sensitive values:

```bash
wrangler secret put D1_REST_API_TOKEN
wrangler secret put STRIPE_API_KEY
```

## Cron Triggers

Schedule workflows to run automatically:

```jsonc
{
  "triggers": {
    "crons": [
      "0 0 * * *",    // Daily at midnight
      "0 */6 * * *",   // Every 6 hours
      "0 9 * * 1"     // Every Monday at 9am
    ]
  }
}
```

```toml
[triggers]
crons = [ "0 0 * * *" ]
```

## Compatibility Settings

### Node.js Compatibility

Required for some npm packages:

```jsonc
{
  "compatibility_flags": ["nodejs_compat"]
}
```

```toml
compatibility_flags = [ "nodejs_compat" ]
```

### Compatibility Date

Set the Workers runtime compatibility date:

```jsonc
{
  "compatibility_date": "2024-10-22"
}
```

## Multiple Workflows

Configure multiple workflows in a single Worker:

```jsonc
{
  "workflows": [
    {
      "name": "email-workflow",
      "binding": "EMAIL_WORKFLOW",
      "class_name": "EmailWorkflow"
    },
    {
      "name": "backup-workflow",
      "binding": "BACKUP_WORKFLOW",
      "class_name": "BackupWorkflow"
    },
    {
      "name": "notification-workflow",
      "binding": "NOTIFICATION_WORKFLOW",
      "class_name": "NotificationWorkflow"
    }
  ]
}
```

```toml
[[workflows]]
name = "email-workflow"
binding = "EMAIL_WORKFLOW"
class_name = "EmailWorkflow"

[[workflows]]
name = "backup-workflow"
binding = "BACKUP_WORKFLOW"
class_name = "BackupWorkflow"

[[workflows]]
name = "notification-workflow"
binding = "NOTIFICATION_WORKFLOW"
class_name = "NotificationWorkflow"
```

## Project Structure

Typical project structure for a Workflows project:

```
my-workflow-project/
├── src/
│   ├── index.ts          # Main Worker entry point
│   ├── workflows/
│   │   ├── email.ts      # Email workflow definition
│   │   └── backup.ts     # Backup workflow definition
│   └── types.ts          # Shared TypeScript types
├── wrangler.jsonc        # Configuration
└── package.json
```

## Local Development

Start local development server:

```bash
npx wrangler dev
```

Expected output:
```
------------------
Your worker has access to the following bindings:
- Workflows:
  - MY_WORKFLOW: MyWorkflow
⎔ Starting local server...
[wrangler:inf] Ready on http://127.0.0.1:8787/
```

## Deployment

Deploy to Cloudflare:

```bash
npx wrangler deploy
```

## Creating New Projects

Use the C3 CLI to create a new Workflows project:

```bash
npm create cloudflare@latest workflows-starter -- --template "cloudflare/workflows-starter"
```

## Important Configuration Notes

1. **Binding Name**: Must be a valid JavaScript identifier (no spaces, starts with letter or underscore)
2. **Class Name**: Must exactly match the exported class name in your code
3. **Workflow Name**: Must be unique across your Cloudflare account
4. **Schema**: The `$schema` field enables IDE autocomplete and validation
5. **Compatibility Date**: Use recent dates for latest features
6. **Node.js Compatibility**: Enable if using npm packages that require Node.js APIs
