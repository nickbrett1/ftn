import * as SentrySvelte from '@sentry/svelte';
import { BrowserTracing } from '@sentry/tracing';

SentrySvelte.init({
	dsn: 'https://2becbe2880ce41ed8198fd63c2cd490f@o1381755.ingest.sentry.io/6695436',
	integrations: [new BrowserTracing()],
	tracesSampleRate: 1.0
});

SentrySvelte.setTag('svelteKit', 'browser');

// This will catch errors in load functions from +page.ts files
export const handleError = ({ error, event }) => {
	SentrySvelte.captureException(error, { contexts: { sveltekit: { event } } });

	return {
		message: error.message
	};
};
