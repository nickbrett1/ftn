<script>
	import { onMount } from 'svelte';
	import { TrashCanSolid, PlusSolid, CheckCircleSolid, CopyRegular } from 'svelte-awesome-icons';
	import { formatDate } from '$lib/utils/date-utils.js';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let keys = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let newKeyName = $state('');
	let generatingKey = $state(false);
	let generatedKey = $state(null);
	let showCopied = $state(false);
	let showInitPrompt = $state(false);
	let initializing = $state(false);

	async function fetchKeys() {
		try {
			loading = true;
			error = null;
			const res = await fetch('/api/api-keys');

			if (res.status === 500) {
				const data = await res.json();
				if (data.error && data.error.includes('no such table')) {
					showInitPrompt = true;
					loading = false;
					return;
				}
			}

			if (!res.ok) {
				throw new Error('Failed to fetch keys');
			}
			const data = await res.json();
			keys = data.keys || [];
			showInitPrompt = false;
		} catch (e) {
			error = e.message;
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function initializeDb() {
		try {
			initializing = true;
			error = null;
			const res = await fetch('/api/api-keys/init', { method: 'POST' });
			if (!res.ok) {
				throw new Error('Failed to initialize database');
			}
			await fetchKeys();

		} catch (e) {
			error = e.message;
			console.error(e);
		} finally {
			initializing = false;
		}
	}

	async function createKey() {
		if (!newKeyName.trim()) return;
		try {
			generatingKey = true;
			error = null;
			const res = await fetch('/api/api-keys', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: newKeyName })
			});

			if (!res.ok) {
				throw new Error('Failed to create key');
			}

			const data = await res.json();
			generatedKey = data.key;
			newKeyName = '';
			await fetchKeys();

		} catch (e) {
			error = e.message;
			console.error(e);
		} finally {
			generatingKey = false;
		}
	}

	async function revokeKey(id) {
		if (
			!confirm(
				'Are you sure you want to revoke this key? Any systems using it will lose access immediately.'
			)
		)
			return;
		try {
			error = null;
			const res = await fetch(`/api/api-keys/${id}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				throw new Error('Failed to revoke key');
			}

			await fetchKeys();

			// Clear the generated key display if we just revoked the newly created key
			if (generatedKey && generatedKey.id === id) {
				generatedKey = null;
			}
		} catch (e) {
			error = e.message;
			console.error(e);
		}
	}

	function copyKey() {
		if (generatedKey?.rawKey) {
			navigator.clipboard.writeText(generatedKey.rawKey);
			showCopied = true;
			setTimeout(() => {
				showCopied = false;
			}, 2000);
		}
	}

	onMount(() => {
		fetchKeys();
	});
</script>

<svelte:head>
	<title>API Keys | Nick Brett</title>
</svelte:head>

<Header />
<div class="mx-auto max-w-4xl px-4 py-12 md:py-24">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight text-white mb-2">API Keys</h1>
		<p class="text-white/60">
			Manage your Personal Access Tokens (PATs) for programmatic access to the MCP server and other
			APIs.
		</p>
	</div>

	{#if error}
		<div class="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-8">
			<p class="text-red-400">{error}</p>
		</div>
	{/if}

	{#if showInitPrompt}
		<div class="bg-green-500/10 border border-green-500/50 rounded-lg p-6 mb-8 text-center">
			<h2 class="text-xl font-semibold text-white mb-2">Setup Required</h2>
			<p class="text-white/70 mb-4">
				The API Keys database table has not been created yet. Please initialize it to continue.
			</p>
			<button
				onclick={initializeDb}
				disabled={initializing}
				class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
			>
				{initializing ? 'Initializing...' : 'Initialize Database'}
			</button>
		</div>
	{:else if !loading}
		<!-- Generate New Key Section -->
		<div class="bg-[#1C1C1E] border border-white/10 rounded-xl p-6 mb-8">
			<h2 class="text-xl font-semibold text-white mb-4">Generate New Token</h2>

			{#if generatedKey}
				<div class="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 mb-4">
					<p class="text-amber-400 font-semibold mb-2">
						Make sure to copy your personal access token now. You won't be able to see it again!
					</p>
					<div class="flex items-center gap-2">
						<code
							class="flex-1 bg-black/50 px-3 py-2 rounded text-green-400 font-mono text-sm break-all"
						>
							{generatedKey.rawKey}
						</code>
						<button
							onclick={copyKey}
							class="p-2 rounded bg-white/5 hover:bg-white/10 text-white transition-colors flex-shrink-0"
							title="Copy to clipboard"
						>
							{#if showCopied}
								<CheckCircleSolid class="size-5 text-green-400" />
							{:else}
								<CopyRegular class="size-5" />
							{/if}
						</button>
					</div>
				</div>
				<button
					onclick={() => (generatedKey = null)}
					class="text-sm text-white/60 hover:text-white transition-colors"
				>
					Clear this message
				</button>
			{:else}
				<div class="flex flex-col sm:flex-row gap-4">
					<input
						type="text"
						bind:value={newKeyName}
						placeholder="What's this token for?"
						class="flex-1 bg-black/50 border border-white/20 rounded px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-green-400 transition-colors"
					/>
					<button
						onclick={createKey}
						disabled={!newKeyName.trim() || generatingKey}
						class="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-green-500 text-black font-semibold px-6 py-2 rounded transition-colors"
					>
						<PlusSolid class="size-4" />
						Generate Token
					</button>
				</div>
			{/if}
		</div>

		<!-- Existing Keys List -->
		<div>
			<h2 class="text-xl font-semibold text-white mb-4">Active Tokens</h2>

			{#if keys.length === 0}
				<div class="bg-[#1C1C1E] border border-white/10 rounded-xl p-8 text-center">
					<p class="text-white/60">You don't have any active personal access tokens.</p>
				</div>
			{:else}
				<div class="bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden">
					<table class="w-full text-left text-sm text-white/80">
						<thead class="bg-white/5 text-white/60 uppercase text-xs">
							<tr>
								<th class="px-6 py-4 font-medium">Name</th>
								<th class="px-6 py-4 font-medium hidden md:table-cell">Created</th>
								<th class="px-6 py-4 font-medium hidden sm:table-cell">Last Used</th>
								<th class="px-6 py-4 font-medium text-right">Action</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/10">
							{#each keys as key}
								<tr class="hover:bg-white/[0.02] transition-colors">
									<td class="px-6 py-4">
										<div class="font-medium text-white">{key.name}</div>
										<div class="text-xs text-white/40 mt-1 sm:hidden">
											Created: {formatDate(key.createdAt)}
										</div>
									</td>
									<td class="px-6 py-4 hidden md:table-cell whitespace-nowrap">
										{formatDate(key.createdAt)}
									</td>
									<td class="px-6 py-4 hidden sm:table-cell whitespace-nowrap">
										{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
									</td>
									<td class="px-6 py-4 text-right">
										<button
											onclick={() => revokeKey(key.id)}
											class="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-400/10 transition-colors"
											title="Revoke Token"
										>
											<TrashCanSolid class="size-4" />
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
		</div>
	{/if}
</div>
<Footer />
