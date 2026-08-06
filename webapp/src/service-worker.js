// Simple service worker example taken from: https://svelte.dev/docs/kit/service-workers
// This caches the app, and any static files eagerly. Ensures each page can work offline once visited.

/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // the app itself
	...files.filter((file) => !file.includes('pdf.worker') && !file.includes('pdf-worker'))
];

self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// ignore non-GET requests
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Do not intercept third-party cross-origin requests (e.g. Cloudflare Insights analytics)
	if (url.origin !== self.location.origin) return;

	async function respond() {
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		// for everything else, try the network first, but
		// fall back to the cache if we're offline
		try {
			const response = await fetch(event.request);

			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new TypeError('invalid response from fetch');
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (_error) {
			console.warn('Service worker fetch fallback:', _error);
			const response = await cache.match(event.request);

			if (response) {
				return response;
			}

			return new Response(null, { status: 504, statusText: 'Network Error' });
		}
	}

	event.respondWith(respond());
});
