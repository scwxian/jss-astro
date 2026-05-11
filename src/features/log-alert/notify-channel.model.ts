import type { NotifyPayload } from "./notify-team.ts";

export interface NotifyChannel {
	readonly name: string;
	send(payload: NotifyPayload): Promise<void>;
	isConfigured(): boolean;
}
