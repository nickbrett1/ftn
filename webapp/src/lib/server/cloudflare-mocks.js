// Mock implementations for Cloudflare edge-only modules during Node.js-based build/test analysis
export class EmailMessage {
	isMock = true;
}
export class RpcTarget {
	isMock = true;
}
export class WorkflowEntrypoint {
	isMock = true;
}
export class WorkflowEvent {
	isMock = true;
}
export class DurableObject {
	isMock = true;
}
export const env = {};

export function connect() {
	return null;
}

export const exports = {};
