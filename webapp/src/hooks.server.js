import { dev } from '$app/environment';

const IN_MEMORY_KV = {};

export async function handle({ event, resolve }) {
	if (dev) {
		event.platform = {
			env: {
				KV: {
					get: async (key) => {
						return IN_MEMORY_KV[key];
					},
					put: async (key, value) => {
						IN_MEMORY_KV[key] = value;
					},
					delete: async (key) => {
						delete IN_MEMORY_KV[key];
					}
				}
			}
		};
	}

	return await resolve(event);
}
