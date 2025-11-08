import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import { dev, building } from '$app/environment';
import { getContext, setContext } from 'svelte';

const DB_KEY = 'DB';

/**
 * @param {any} platform
 */
export function getDb(platform) {
	if (building) {
		const db = getContext(DB_KEY);
		if (db) return db;

		const newDb = {};
		setContext(DB_KEY, newDb);
		return newDb;
	}
	if (dev) {
		return drizzle(platform.env.DB, { schema });
	}
	return drizzle(platform.env.DB, { schema });
}

export const db = getDb(globalThis.platform);
