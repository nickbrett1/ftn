<script>
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';

	// Svelte 5 states
	let logs = $state([]);
	let status = $state('idle');
	let errorMsg = $state('');
	let persona = $state('Shop for tech stickers under $15');
	let workerHost = $state('agent-swarm.nick-brett1.workers.dev');
	let sessionId = $state('');
	let isConnecting = $state(false);

	let limits = $state(null);
	let isFetchingLimits = $state(false);

	let consoleElement = $state(null);

	// Helper for formatting seconds into m s format
	function formatSeconds(seconds) {
		if (seconds == null) return '0s';
		if (typeof seconds === 'string' && isNaN(Number(seconds))) return seconds;
		if (isNaN(seconds)) return '0s';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return m > 0 ? `${m}m ${s}s` : `${s}s`;
	}

	// Pre-configured personas
	const personas = [
		'Shop for tech stickers under $15',
		'Find a developer sticker and buy it in Stripe test-mode',
		'Add the cheapest item to cart and purchase it'
	];

	// Helper functions to get CSS classes for agent status to avoid nested ternary expressions and object injection sink warnings
	function getStatusClass(currentStatus) {
		switch (currentStatus) {
			case 'idle': {
				return 'bg-slate-800/40 border-slate-700 text-slate-400';
			}
			case 'fetching_token': {
				return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
			}
			case 'connecting': {
				return 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse';
			}
			case 'running': {
				return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-bold animate-pulse';
			}
			case 'completed': {
				return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold';
			}
			default: {
				return 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold';
			}
		}
	}

	function getStatusDotClass(currentStatus) {
		switch (currentStatus) {
			case 'idle': {
				return 'bg-slate-400';
			}
			case 'fetching_token': {
				return 'bg-cyan-400';
			}
			case 'connecting': {
				return 'bg-blue-400';
			}
			case 'running': {
				return 'bg-indigo-400';
			}
			case 'completed': {
				return 'bg-emerald-400';
			}
			default: {
				return 'bg-rose-400';
			}
		}
	}

	// Browser-only dynamic import for AgentClient
	let AgentClientClass = null;

	onMount(async () => {
		if (browser) {
			tippy('[data-tippy-content]');
			try {
				const module = await import('agents/client');
				AgentClientClass = module.AgentClient;
			} catch (err) {
				console.error('Failed to load agents SDK:', err);
				addLog('Error: Failed to load agents client SDK.', 'system-error');
			}
			await fetchLimits();
		}
	});

	async function fetchLimits() {
		if (!workerHost) return;
		isFetchingLimits = true;
		try {
			const res = await fetch(`https://${workerHost}/limits`);
			if (res.ok) {
				limits = await res.json();
			} else {
				console.warn('Failed to fetch worker limits:', res.status, res.statusText);
			}
		} catch (err) {
			console.error('Error fetching worker limits:', err);
		} finally {
			isFetchingLimits = false;
		}
	}

	function addLog(message, type = 'info') {
		logs.push({
			timestamp: new Date().toLocaleTimeString(),
			message,
			type
		});
		// Auto scroll to bottom
		tick().then(() => {
			if (consoleElement) {
				consoleElement.scrollTop = consoleElement.scrollHeight;
			}
		});
	}

	async function startSwarm() {
		if (!AgentClientClass) {
			errorMsg = 'Client SDK not loaded yet. Please wait.';
			return;
		}

		status = 'fetching_token';
		errorMsg = '';
		isConnecting = true;
		logs = [];

		addLog('1. Fetching pre-signed HMAC token from SvelteKit backend...', 'step');

		try {
			const res = await fetch('/api/token/agent-swarm');
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Failed to fetch HMAC token');
			}
			const { expiry, signature } = await res.json();
			addLog('✅ Token retrieved successfully.', 'success');

			status = 'connecting';
			sessionId = `swarm-session-${Date.now()}`;
			addLog(`2. Connecting to WebSocket swarm at ${workerHost}...`, 'step');
			addLog(`Session ID: ${sessionId}`, 'info');

			const client = new AgentClientClass({
				agent: 'ShopperAgent',
				name: sessionId,
				host: workerHost,
				query: {
					expiry: expiry.toString(),
					signature
				},
				onClose: (event) => {
					if (!client.identified) {
						addLog(
							`❌ WebSocket connection closed unexpectedly. Code: ${event?.code}`,
							'system-error'
						);
					} else if (status !== 'completed' && status !== 'failed') {
						addLog(`❌ WebSocket connection closed. Code: ${event?.code}`, 'system-error');
					}
					if (status !== 'completed') {
						status = 'failed';
						isConnecting = false;
					}
				},
				onError: (error) => {
					addLog(`❌ WebSocket error: ${error?.message || 'Unknown error'}`, 'system-error');
				},
				onStateUpdate: (state) => {
					if (state.status && status !== 'completed' && status !== 'failed') {
						status = state.status;
					}
					if (state.history && state.history.length > 0) {
						// Sync logs
						const newLogs = state.history;
						// To avoid duplicating logs, reset and add them
						logs = logs.filter(
							(l) => l.type === 'step' || l.type === 'success' || l.type === 'system-error'
						);
						newLogs.forEach((step) => {
							addLog(step, 'agent');
						});
					}
				}
			});

			// Add a timeout for the ready signal in case the server fails to send identity
			let timeoutId;
			const readyTimeout = new Promise((_, reject) => {
				timeoutId = setTimeout(
					() =>
						reject(
							new Error(
								'Timed out waiting for Agent identity signal. The worker might be unreachable or not returning the correct cf_agent_identity.'
							)
						),
					15000
				);
			});

			await Promise.race([client.ready, readyTimeout]);
			clearTimeout(timeoutId);
			addLog('✅ WebSocket connection established. Agent ready.', 'success');

			status = 'running';
			addLog(`3. Invoking RPC runShopping with persona: "${persona}"`, 'step');

			const result = await client.call('runShopping', [persona]);
			status = 'completed';
			addLog('🎉 Swarm session completed successfully!', 'success');
			addLog(`Result outcome: ${result}`, 'info');
		} catch (err) {
			console.error(err);
			status = 'failed';
			errorMsg = err.message || 'An unknown error occurred during swarm connection.';
			addLog(`❌ Error: ${errorMsg}`, 'system-error');
		} finally {
			isConnecting = false;
			await fetchLimits();
		}
	}
</script>

<svelte:head>
	<title>Agent Swarm Console - fintechnick.com</title>
	<meta
		name="description"
		content="Control and inspect stateful browser automation agent swarms in real-time."
	/>
</svelte:head>

<Header />

<main class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
	<div class="max-w-6xl w-full mx-auto px-4 py-12 flex-grow space-y-8">
		<!-- Hero Section -->
		<div class="text-center space-y-4">
			<span
				class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
			>
				<span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
				Autonomous Durable Agents
			</span>
			<h1
				class="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400"
			>
				Agent Swarm Console
			</h1>
			<p class="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
				Generate short-lived HMAC signatures, instantiate Durable Object agent clients, and
				orchestrate browser-rendering Puppeteer sessions in real-time.
			</p>
		</div>

		<!-- Main Dashboard Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Configuration & Limits Column -->
			<div class="space-y-8 lg:col-span-1">
				<!-- Configuration Panel -->
				<div
					class="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl"
				>
					<h2
						class="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2"
					>
						<svg
							class="w-5 h-5 text-indigo-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Swarm Configuration
					</h2>

					<!-- Worker Host Input -->
					<div class="space-y-2">
						<label
							for="workerHost"
							class="block text-xs font-semibold uppercase tracking-wider text-slate-400"
							>Worker WebSocket Host</label
						>
						<input
							type="text"
							id="workerHost"
							bind:value={workerHost}
							class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
						/>
					</div>

					<!-- Persona Selection -->
					<div class="space-y-3">
						<span class="block text-xs font-semibold uppercase tracking-wider text-slate-400"
							>Buyer Persona</span
						>
						<div class="flex flex-col gap-2">
							{#each personas as p}
								<button
									type="button"
									onclick={() => (persona = p)}
									class="text-left text-xs px-3.5 py-3 rounded-xl border transition-all duration-200 {persona ===
									p
										? 'bg-indigo-600/15 border-indigo-500/80 text-white font-medium shadow-md shadow-indigo-600/5'
										: 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'}"
								>
									{p}
								</button>
							{/each}
						</div>
						<!-- Custom Input -->
						<div class="space-y-1.5">
							<span class="text-[10px] text-slate-500 uppercase tracking-wider"
								>Or enter custom persona</span
							>
							<input
								type="text"
								bind:value={persona}
								placeholder="e.g. Shop for tech stickers under $15"
								class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
							/>
						</div>
					</div>

					<!-- Status and Trigger -->
					<div class="pt-4 border-t border-slate-800/60 space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-xs text-slate-400 uppercase tracking-wider font-semibold"
								>Agent Status</span
							>
							<span
								class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider transition-all duration-200 {getStatusClass(
									status
								)}"
							>
								<span class="w-1.5 h-1.5 rounded-full {getStatusDotClass(status)}"></span>
								{status.replace('_', ' ')}
							</span>
						</div>

						<button
							type="button"
							onclick={startSwarm}
							disabled={isConnecting || status === 'running'}
							class="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{#if isConnecting || status === 'running'}
								<svg
									class="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-400"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Agent Engaged...
							{:else}
								Engage Shopper Swarm
							{/if}
						</button>

						{#if errorMsg}
							<div
								class="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3.5 text-xs"
							>
								<strong>Swarm Error:</strong>
								{errorMsg}
							</div>
						{/if}
					</div>
				</div>

				<!-- Limits Panel -->
				<div
					class="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl"
				>
					<div class="border-b border-slate-800 pb-3 flex items-center justify-between">
						<h2 class="text-lg font-bold text-white flex items-center gap-2">
							<svg
								class="w-5 h-5 text-indigo-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
							Resource Usage & Limits
						</h2>
						{#if isFetchingLimits}
							<svg
								class="animate-spin h-4 w-4 text-indigo-400"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{/if}
					</div>

					<div class="space-y-3">
						{#if limits}
							<div class="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4 space-y-3">
								<div class="flex justify-between items-center text-xs">
									<span class="text-slate-400">Concurrent Sessions</span>
									<span class="text-slate-200 font-mono"
										>{limits.browser.activeSessionsCount} / {limits.browser
											.maxConcurrentSessions}</span
									>
								</div>
								<div
									class="flex justify-between items-center text-xs border-t border-slate-800/60 pt-3"
								>
									<span
										class="text-slate-400 cursor-help border-b border-dotted border-slate-500"
										data-tippy-content="Number of new browser sessions that can be started within the current minute."
										>Remaining Browser Starts / Min</span
									>
									<span class="text-slate-200 font-mono"
										>{limits.browser.allowedBrowserAcquisitions}</span
									>
								</div>
								{#if limits.browser.timeUntilNextAllowedBrowserAcquisition > 0 || limits.browser.timeUntilNextAcquisition > 0}
									<div
										class="flex justify-between items-center text-xs border-t border-slate-800/60 pt-3"
									>
										<span class="text-slate-400">Time Until Next Acq.</span>
										<span class="text-slate-200 font-mono"
											>{formatSeconds(
												limits.browser.timeUntilNextAllowedBrowserAcquisition ||
													limits.browser.timeUntilNextAcquisition
											)}</span
										>
									</div>
								{/if}
								<div
									class="flex justify-between items-center text-xs border-t border-slate-800/60 pt-3"
								>
									<span class="text-slate-400">Browser Time Used</span>
									<span class="text-slate-200 font-mono"
										>{formatSeconds(limits.browser.usedBrowserTimeSeconds)} / {limits.browser
											.browserTimeSecondsLimit
											? formatSeconds(limits.browser.browserTimeSecondsLimit)
											: 'N/A'}</span
									>
								</div>
								{#if limits.ai?.model}
									<div
										class="flex justify-between items-center text-xs border-t border-slate-800/60 pt-3"
									>
										<span class="text-slate-400">Primary AI Model</span>
										<span class="text-indigo-300 font-mono text-[10px] truncate ml-2"
											>{limits.ai.model}</span
										>
									</div>
								{/if}
								{#if limits.gemini?.model}
									<div
										class="flex justify-between items-center text-xs border-t border-slate-800/60 pt-3"
									>
										<span class="text-slate-400">Vision Model</span>
										<span class="text-indigo-300 font-mono text-[10px] truncate ml-2"
											>{limits.gemini.model}</span
										>
									</div>
								{/if}
							</div>
						{:else if isFetchingLimits}
							<div class="text-xs text-slate-500 animate-pulse text-center py-4">
								Fetching limits...
							</div>
						{:else}
							<div class="text-xs text-slate-500 text-center py-4">No limit data available.</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Terminal / Log Output Panel -->
			<div
				class="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 lg:col-span-2 flex flex-col h-[520px] shadow-xl"
			>
				<div class="border-b border-slate-800 pb-3 flex items-center justify-between">
					<h2 class="text-lg font-bold text-white flex items-center gap-2">
						<svg
							class="w-5 h-5 text-indigo-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						Live Execution Console
					</h2>
					<button
						type="button"
						onclick={() => (logs = [])}
						class="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
					>
						Clear Console
					</button>
				</div>

				<!-- Console Logs Display -->
				<div
					bind:this={consoleElement}
					class="mt-4 flex-grow bg-slate-950/80 backdrop-blur border border-slate-900 rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-2.5 shadow-inner"
				>
					{#if logs.length === 0}
						<div
							class="text-slate-500 flex flex-col items-center justify-center h-full text-center space-y-2"
						>
							<svg
								class="w-8 h-8 text-slate-700"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								/>
							</svg>
							<span
								>Terminal is currently idle.<br />Select a persona and engage the swarm to start.</span
							>
						</div>
					{/if}

					{#each logs as log}
						<div class="flex items-start gap-3 transition-all">
							<span class="text-slate-600 select-none">[{log.timestamp}]</span>

							{#if log.type === 'step'}
								<span class="text-indigo-400 font-semibold">{log.message}</span>
							{:else if log.type === 'success'}
								<span class="text-emerald-400 font-semibold">{log.message}</span>
							{:else if log.type === 'system-error'}
								<span class="text-rose-500 font-bold">{log.message}</span>
							{:else if log.type === 'agent'}
								<span class="text-slate-300">&gt; {log.message}</span>
							{:else}
								<span class="text-slate-400">{log.message}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<Footer />
</main>

<style>
	/* Scrollbar styling for console */
	::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}
	::-webkit-scrollbar-track {
		background: transparent;
	}
	::-webkit-scrollbar-thumb {
		background: #1e293b;
		border-radius: 3px;
	}
	::-webkit-scrollbar-thumb:hover {
		background: #334155;
	}
</style>
