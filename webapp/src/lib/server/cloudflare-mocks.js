// Mock implementations for Cloudflare edge-only modules during Node.js-based build/test analysis
export class EmailMessage {
	isMock = true;
}
export class RpcTarget {
	isMock = true;
}
export const exports = {};
