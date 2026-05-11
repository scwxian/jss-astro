/**
 * Test script for notify-team webhook
 * Run with: node src/features/shared/notify-team.test.js
 *
 * This bypasses the production check and dedup to test webhook functionality.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Simple env loader (dotenv not installed)
function loadEnv() {
	try {
		const envPath = resolve(process.cwd(), ".env");
		const envContent = readFileSync(envPath, "utf-8");
		const lines = envContent.split("\n");
		for (const line of lines) {
			const match = line.match(/^([^=]+)=(.*)$/);
			if (match) {
				const key = match[1].trim();
				let value = match[2].trim();
				// Remove quotes if present
				if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
					value = value.slice(1, -1);
				}
				if (!process.env[key]) {
					process.env[key] = value;
				}
			}
		}
	} catch {
		// .env file not found, continue
	}
}
loadEnv();

// Test configuration
const teamEmails = ["admin@example.com"];

// Pick first available notification channel for test
const gasUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
const slackUrl = process.env.NOTIFY_SLACK_WEBHOOK_URL;
const genericUrl = process.env.NOTIFY_GENERIC_WEBHOOK_URL;

// Test payload
const testPayload = {
	severity: "warning",
	component: "test-webhook",
	operation: "verify-functionality",
	error: new Error("This is a test notification to verify webhook functionality"),
	context: {
		requestId: `test-${Date.now()}`,
		metadata: {
			test: true,
			timestamp: new Date().toISOString(),
			message: "If you receive this email, the webhook is working!",
			environment: "manual-test",
		},
	},
};

// Build email content
function buildEmailContent(payload) {
	const { severity, component, operation, error, context } = payload;
	const errorMessage = error instanceof Error ? error.message : error;
	const errorStack = error instanceof Error ? error.stack : "No stack trace";
	const timestamp = new Date().toISOString();

	const subject = `[${severity.toUpperCase()}] ${component}.${operation} - ${errorMessage.slice(0, 50)}`;

	const body = `TEST NOTIFICATION
=================
Severity: ${severity.toUpperCase()}
Component: ${component}
Operation: ${operation}
Time: ${timestamp}
Environment: TEST

ERROR DETAILS
=============
Message: ${errorMessage}
Stack: ${errorStack}

CONTEXT
=======
Request ID: ${context?.requestId || "N/A"}
Test Message: ${context?.metadata?.message || "N/A"}

RAW METADATA
============
${JSON.stringify({ severity, component, operation, error: errorMessage, timestamp, context }, null, 2)}`;

	const htmlBody = `<h2>TEST NOTIFICATION</h2>
<p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
<p><strong>Component:</strong> ${component}</p>
<p><strong>Operation:</strong> ${operation}</p>
<p><strong>Time:</strong> ${timestamp}</p>
<p><strong>Environment:</strong> TEST</p>

<h3>ERROR DETAILS</h3>
<p><strong>Message:</strong> ${errorMessage}</p>
<pre>${errorStack}</pre>

<h3>CONTEXT</h3>
<p><strong>Request ID:</strong> ${context?.requestId || "N/A"}</p>
<p><strong>Test Message:</strong> ${context?.metadata?.message || "N/A"}</p>`;

	return { subject, body, htmlBody };
}

// Send webhook directly
async function sendTestWebhook() {
	const webhookUrl = gasUrl || slackUrl || genericUrl;
	const channel = gasUrl ? "GAS" : slackUrl ? "Slack" : "Generic";

	if (!webhookUrl) {
		console.error("❌ No notification channel configured");
		console.log("\nAdd to .env file (at least one):");
		console.log('GOOGLE_SCRIPT_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_ID/exec"');
		console.log('NOTIFY_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"');
		console.log('NOTIFY_GENERIC_WEBHOOK_URL="https://your-webhook.example.com/notify"');
		process.exit(1);
	}

	console.log(`📧 Sending test notification via ${channel}...`);
	console.log(`   Webhook URL: ${webhookUrl.slice(0, 50)}...`);
	console.log(`   Recipients: ${teamEmails.join(", ")}`);

	const { subject, body, htmlBody } = buildEmailContent(testPayload);

	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				recipients: teamEmails,
				subject,
				body,
				htmlBody,
				senderName: "Site Alerts",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`HTTP ${response.status}: ${errorText}`);
		}

		const result = await response.json();
		console.log("\n✅ SUCCESS!");
		console.log("   Response:", JSON.stringify(result, null, 2));
		console.log("\n📬 Check your email (admin@example.com)");
		console.log("   Subject:", subject);
	} catch (error) {
		console.error("\n❌ FAILED!");
		console.error("   Error:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// Run test
sendTestWebhook();
