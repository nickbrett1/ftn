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
		const database = getContext(DB_KEY);
		if (database) return database;

		const newDatabase = {};
		setContext(DB_KEY, newDatabase);
		return newDatabase;
	}
	if (dev) {
		return drizzle(platform.env.DB, { schema });
	}
	return drizzle(platform.env.DB, { schema });
}

export const db = getDb(globalThis.platform);
