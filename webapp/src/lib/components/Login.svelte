<script>
	import { onMount } from 'svelte';
	import { nanoid } from 'nanoid';
	import { goto } from '$app/navigation';

	let loggedIn = $state(false);
	let client = null;

	let { loginCallback, children } = $props();

	onMount(async () => {
		const match = document.cookie.match(/(^| )auth=([^;]+)/);
		const hasValidAuth = match !== null && match[2] !== 'deleted';
		loggedIn = hasValidAuth;
		loginCallback?.(loggedIn);
	});

	function onload() {
		const GOOGLE_CLIENT_ID =
			'263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com';

		window.google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: (response) => {
				if (!response.credential || !response.clientId) {
					throw new Error('Failed to initialize google sign in');
				}
			}
		});

		const state = nanoid();

		client = window.google.accounts.oauth2.initCodeClient({
			client_id: GOOGLE_CLIENT_ID,
			scope: 'openid profile email',
			ux_mode: 'redirect',
			state,
			redirect_uri:
				process.env.NODE_ENV === 'development'
					? 'http://127.0.0.1:5173/auth'
					: 'https://fintechnick.com/auth',
			callback: (response) => {
				if (response.error) {
					throw new Error('Failed to initCodeClient', response.error);
				}
				if (response.state !== state) {
					throw new Error('State mismatch');
				}
			}
		});

		client.requestCode();
	}

	function onClick() {
		if (loggedIn) {
			goto('/projects/ccbilling');
			return;
		}
		if (client) {
			client.requestCode();
			return;
		}

		const script = document.createElement('script');

		script.src = 'https://accounts.google.com/gsi/client';
		script.nonce = '%sveltekit.nonce%';
		script.onload = onload;
		script.onerror = () => {
			throw new Error('Google gsi script failed to load');
		};

		document.body.appendChild(script);
	}
</script>

<button onclick={onClick}>
	{@render children?.()}
</button>
