export const prerender = false;
import type { APIRoute } from "astro";
import { NOTIFY_SECRET, SITE_URL } from "astro:env/server";
import { notifyTeam } from "@log-alert/notify-team";

// Test endpoint for notify-team functionality. POST to send test, GET for health check.

export const POST: APIRoute = async ({ request }) => {
	// Verify secret token
	const authHeader = request.headers.get("Authorization");
	const expectedToken = NOTIFY_SECRET;
	const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

	if (!expectedToken || token !== expectedToken) {
		return new Response(
			JSON.stringify({ success: false, error: "Unauthorized" }),
			{ status: 401, headers: { "Content-Type": "application/json" } },
		);
	}

	// Only allow in production
	const siteUrl = SITE_URL;
	if (!siteUrl) {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Test endpoint only available in production",
				hint: "Set SITE_URL to enable",
			}),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		// Send test notification
		await notifyTeam({
			severity: "info",
			component: "test",
			operation: "test-notification",
			error: new Error("This is a test notification"),
			context: {
				requestId: `test-${Date.now()}`,
				metadata: {
					test: true,
					timestamp: new Date().toISOString(),
					message: "If you receive this email, the notification system is working correctly!",
				},
			},
		});

		return new Response(
			JSON.stringify({
				success: true,
				message: "Test notification sent successfully",
				note: "Check your notification channel for the test message",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		return new Response(
			JSON.stringify({
				success: false,
				error: errorMessage,
				hint: "Check that at least one notification channel is configured (GOOGLE_SCRIPT_WEBHOOK_URL, NOTIFY_SLACK_WEBHOOK_URL, etc.)",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};

export const GET: APIRoute = () => {
	return new Response(
		JSON.stringify({
			status: "healthy",
			endpoint: "/api/test-notify",
			methods: ["GET", "POST"],
			description: "POST to send test notification, GET for health check",
			productionOnly: true,
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
};
