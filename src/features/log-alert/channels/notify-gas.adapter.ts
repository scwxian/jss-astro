// Google Apps Script email notification adapter
import { GOOGLE_SCRIPT_WEBHOOK_URL } from "astro:env/server";
import type { NotifyChannel } from "../notify-channel.model.ts";
import { teamEmails } from "../notify-team.ts";
import type { NotifyPayload } from "../notify-team.ts";

export class GasNotifyAdapter implements NotifyChannel {
	readonly name = "gas";

	isConfigured(): boolean {
		return Boolean(GOOGLE_SCRIPT_WEBHOOK_URL);
	}

	async send(payload: NotifyPayload): Promise<void> {
		const url = GOOGLE_SCRIPT_WEBHOOK_URL;
		if (!url) throw new Error("GOOGLE_SCRIPT_WEBHOOK_URL not configured");

		const { subject, body, htmlBody } = buildEmailContent(payload);
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				recipients: teamEmails,
				subject,
				body,
				htmlBody,
				senderName: "Site Alerts",
			}),
		});

		if (!response.ok) {
			throw new Error(
				`GAS webhook failed: ${response.status} ${response.statusText}`,
			);
		}
	}
}

function buildEmailContent(payload: NotifyPayload): {
	subject: string;
	body: string;
	htmlBody: string;
} {
	const { severity, component, operation, error, context } = payload;
	const errorMessage = error instanceof Error ? error.message : error;
	const errorStack = error instanceof Error ? error.stack : "No stack trace";
	const timestamp = new Date().toISOString();

	const subject = `[${severity.toUpperCase()}] ${component}.${operation} - ${errorMessage.slice(0, 50)}${errorMessage.length > 50 ? "..." : ""}`;

	const body = `ERROR SUMMARY
=============
Severity: ${severity.toUpperCase()}
Component: ${component}
Operation: ${operation}
Time: ${timestamp}
Environment: production

ERROR DETAILS
=============
Message: ${errorMessage}
Stack: ${errorStack}

CONTEXT
=======
Request ID: ${context?.requestId || "N/A"}
User ID: ${context?.userId || "N/A"}
Order ID: ${context?.orderId || "N/A"}
Cart State: ${context?.cartState ? JSON.stringify(context.cartState, null, 2) : "N/A"}

DEBUGGING AIDS
==============
• Component: ${component}
• Operation: ${operation}
• Timestamp: ${timestamp}
• Site URL: N/A

RAW METADATA (AI-PARSEABLE)
============================
${JSON.stringify(
		{
			severity,
			component,
			operation,
			error: errorMessage,
			timestamp,
			context: context || {},
		},
		null,
		2,
	)}`;

	const htmlBody = `<h2>ERROR SUMMARY</h2>
<p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
<p><strong>Component:</strong> ${component}</p>
<p><strong>Operation:</strong> ${operation}</p>
<p><strong>Time:</strong> ${timestamp}</p>
<p><strong>Environment:</strong> production</p>

<h2>ERROR DETAILS</h2>
<p><strong>Message:</strong> ${errorMessage}</p>
<pre>${errorStack}</pre>

<h2>CONTEXT</h2>
<ul>
<li><strong>Request ID:</strong> ${context?.requestId || "N/A"}</li>
<li><strong>User ID:</strong> ${context?.userId || "N/A"}</li>
<li><strong>Order ID:</strong> ${context?.orderId || "N/A"}</li>
</ul>

<h2>DEBUGGING AIDS</h2>
<ul>
<li>Component: ${component}</li>
<li>Operation: ${operation}</li>
<li>Timestamp: ${timestamp}</li>
</ul>

<h2>RAW METADATA (AI-PARSEABLE)</h2>
<pre>${JSON.stringify(
		{
			severity,
			component,
			operation,
			error: errorMessage,
			timestamp,
			context: context || {},
		},
		null,
		2,
	)}</pre>`;

	return { subject, body, htmlBody };
}
