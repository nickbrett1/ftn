<script>
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import BarcodeSvg from '$lib/components/stripe-toddler/BarcodeSvg.svelte';
	import QrCodeSvg from '$lib/components/stripe-toddler/QrCodeSvg.svelte';
	import {
		BoxSolid,
		ChartLineSolid,
		FileLinesSolid,
		PlusSolid,
		RotateSolid,
		CheckSolid,
		UploadSolid,
		BarcodeSolid,
		TagSolid,
		BabySolid,
		WandMagicSparklesSolid,
		TrashCanSolid,
		MagnifyingGlassPlusSolid,
		XmarkSolid
	} from 'svelte-awesome-icons';

	/**
	 * @typedef {Object} Props
	 * @property {Object} data
	 * @property {string} [data.workerUrl]
	 */

	/** @type {Props} */
	let { data } = $props();

	// State variables
	let activeTab = $state('inventory'); // 'inventory' | 'analytics'
	let workerUrl = $state(data?.workerUrl || 'https://stripe-toddler.nick-brett1.workers.dev');

	// Inventory state
	let inventoryItems = $state(data?.initialInventory || []);
	let sessionAddedBarcodes = $state(new Set());
	let selectedBarcodesForPrint = $state(new Set());
	let printSelectionMode = $state('all'); // 'session' | 'all' | 'custom'
	let barcodeFormat = $state('qr'); // 'qr' | '1d'

	// Form state
	let newItemName = $state('');
	let newItemPriceUsd = $state(5);
	let newItemBarcode = $state('');
	let newItemImageUrl = $state('');
	let isSavingItem = $state(false);
	let isEditing = $state(false);
	let isGeneratingAiImage = $state(false);
	let customAiPrompt = $state('');
	let isUserPromptCustomized = $state(false);
	let formSuccessMessage = $state('');
	let formErrorMessage = $state('');
	let imageFile = $state(null);
	let imagePreviewUrl = $state('');

	// Image Zoom Lightbox state
	let zoomedImage = $state(null); // { url: string, title: string, subtitle?: string } | null

	function handleZoomImage(url, title = '', subtitle = '') {
		if (!url) return;
		zoomedImage = { url, title, subtitle };
	}

	function handleCloseZoom() {
		zoomedImage = null;
	}

	// Analytics & Server Status state
	let transactions = $state(data?.initialTransactions || []);
	let isLoadingAnalytics = $state(false);
	let isLoadingInventory = $state(false);
	let serverError = $state(data?.serverError || '');

	async function fetchInventory() {
		isLoadingInventory = true;
		try {
			const res = await fetch('/projects/stripe-toddler-admin/api/inventory');
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					const serverBarcodes = new Set(data.map((i) => i.barcode));
					const sessionOnlyItems = inventoryItems.filter(
						(i) => sessionAddedBarcodes.has(i.barcode) && !serverBarcodes.has(i.barcode)
					);
					inventoryItems = [...sessionOnlyItems, ...data];
				}
				serverError = '';
			} else {
				console.warn(`Server proxy returned HTTP ${res.status}`);
			}
		} catch (err) {
			console.warn('Failed to refresh inventory:', err);
		} finally {
			isLoadingInventory = false;
		}
	}

	async function fetchAnalytics() {
		isLoadingAnalytics = true;
		try {
			const res = await fetch(
				`${workerUrl.replace(/\/$/, '')}/api/admin/analytics?limit=100&offset=0`
			);
			if (res.ok) {
				const data = await res.json();
				transactions = Array.isArray(data) ? data : [];
			} else if (!serverError) {
				serverError = `Worker API returned HTTP ${res.status} ${res.statusText} on GET /api/admin/analytics`;
			}
		} catch (err) {
			console.error('Failed to fetch analytics:', err);
			if (!serverError) {
				serverError = `Unable to connect to Worker API at ${workerUrl}: ${err.message}`;
			}
		} finally {
			isLoadingAnalytics = false;
		}
	}

	function generateBarcodeFromName(name) {
		if (!name) return 'TOY-001';
		const slug = name
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
			.substring(0, 16);
		return `TOY-${slug || 'ITEM'}-001`;
	}

	function getDefaultPrompt(name) {
		const itemName = (name || '').trim() || 'item';
		return `Professional retail product photograph of ${itemName}, as seen in a shop, clean white background, sharp focus, commercial product photography lighting, photorealistic`;
	}

	function handleNameChange(e) {
		newItemName = e.target.value;
		if (!isEditing) {
			newItemBarcode = generateBarcodeFromName(newItemName);
		}
		if (!isUserPromptCustomized) {
			customAiPrompt = getDefaultPrompt(newItemName);
		}
	}

	function handleEditItem(item) {
		newItemName = item.name;
		newItemPriceUsd = item.price_cents ? item.price_cents / 100 : 5;
		newItemBarcode = item.barcode;
		newItemImageUrl = item.image_url || '';
		imagePreviewUrl = item.image_url || '';
		isEditing = true;
		isUserPromptCustomized = false;
		customAiPrompt = getDefaultPrompt(item.name);
		formSuccessMessage = `Editing item ${item.name} (${item.barcode}). Update fields below and click Save.`;
		formErrorMessage = '';

		if (typeof window !== 'undefined') {
			const el = document.getElementById('inventory-item-form');
			if (el) el.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function handleCancelEdit() {
		newItemName = '';
		newItemPriceUsd = 5;
		newItemBarcode = '';
		newItemImageUrl = '';
		imageFile = null;
		imagePreviewUrl = '';
		isEditing = false;
		isUserPromptCustomized = false;
		customAiPrompt = getDefaultPrompt('');
		formSuccessMessage = '';
		formErrorMessage = '';
	}

	async function handleDeleteItem(barcode, name) {
		if (
			typeof window !== 'undefined' &&
			!confirm(`Are you sure you want to delete "${name}" (${barcode}) from inventory?`)
		) {
			return;
		}

		// Save a snapshot before optimistic removal so we can restore on failure
		const itemToDelete = inventoryItems.find((i) => i.barcode === barcode);
		const itemIndex = inventoryItems.findIndex((i) => i.barcode === barcode);

		try {
			// Optimistically remove from local state
			inventoryItems = inventoryItems.filter((i) => i.barcode !== barcode);
			sessionAddedBarcodes.delete(barcode);
			sessionAddedBarcodes = new Set(sessionAddedBarcodes);
			selectedBarcodesForPrint.delete(barcode);
			selectedBarcodesForPrint = new Set(selectedBarcodesForPrint);

			const res = await fetch(
				`/projects/stripe-toddler-admin/api/inventory?barcode=${encodeURIComponent(barcode)}`,
				{ method: 'DELETE' }
			);

			if (res.ok) {
				formSuccessMessage = `Successfully deleted "${name}" (${barcode}) from inventory.`;
				formErrorMessage = '';
			} else {
				// Restore the item if the server rejected the delete
				if (itemToDelete !== undefined) {
					inventoryItems = [
						...inventoryItems.slice(0, itemIndex),
						itemToDelete,
						...inventoryItems.slice(itemIndex)
					];
				}
				formErrorMessage = `Failed to delete item from server (HTTP ${res.status}).`;
			}
		} catch (err) {
			// Restore the item on network errors too
			if (itemToDelete !== undefined) {
				inventoryItems = [
					...inventoryItems.slice(0, itemIndex),
					itemToDelete,
					...inventoryItems.slice(itemIndex)
				];
			}
			console.error('Error deleting item:', err);
			formErrorMessage = `Error deleting item: ${err.message}`;
		}
	}

	function handleFileSelect(e) {
		const files = e.target.files;
		if (files && files[0]) {
			imageFile = files[0];
			imagePreviewUrl = URL.createObjectURL(imageFile);
		}
	}

	function getEffectivePrompt() {
		if (customAiPrompt.trim()) return customAiPrompt.trim();
		return getDefaultPrompt(newItemName);
	}

	async function handleGenerateAiImage() {
		if (!newItemName && !customAiPrompt) {
			formErrorMessage =
				'Please enter an Item Name or Custom Prompt first to generate an AI image.';
			return;
		}

		const promptToSend = getEffectivePrompt();
		isGeneratingAiImage = true;
		formErrorMessage = '';
		formSuccessMessage = `Generating AI image with Cloudflare AI...`;

		try {
			const res = await fetch('/projects/stripe-toddler-admin/api/generate-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemName: newItemName,
					prompt: promptToSend
				})
			});

			if (res.ok) {
				const data = await res.json();
				if (data.image_url) {
					newItemImageUrl = data.image_url;
					imagePreviewUrl = data.image_url;
					formSuccessMessage = `Successfully generated AI image!`;
				} else {
					formErrorMessage = 'Failed to generate AI image: No URL returned.';
				}
			} else {
				formErrorMessage = `AI image generation failed (HTTP ${res.status}).`;
			}
		} catch (err) {
			console.error('Error generating AI image:', err);
			formErrorMessage = `AI image generation error: ${err.message}`;
		} finally {
			isGeneratingAiImage = false;
		}
	}

	async function handleUploadImage() {
		if (!imageFile) return newItemImageUrl;
		try {
			const formData = new FormData();
			formData.append('barcode', newItemBarcode);
			formData.append('image', imageFile);

			const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/admin/inventory/upload`, {
				method: 'POST',
				body: formData
			});

			if (res.ok) {
				const result = await res.json();
				if (result.image_url) {
					newItemImageUrl = result.image_url;
					return result.image_url;
				}
			}
		} catch (err) {
			console.warn('Image upload error:', err);
		}

		// Fallback preview URL if upload fails or is dev mode
		if (imagePreviewUrl) newItemImageUrl = imagePreviewUrl;
		return newItemImageUrl;
	}

	async function handleSaveItem() {
		formSuccessMessage = '';
		formErrorMessage = '';

		if (!newItemName || !newItemBarcode || newItemPriceUsd <= 0) {
			formErrorMessage = 'Please fill in item name, price, and barcode.';
			return;
		}

		isSavingItem = true;

		try {
			if (imageFile) {
				await handleUploadImage();
			}

			const payload = {
				barcode: newItemBarcode,
				name: newItemName,
				price_cents: Math.round(newItemPriceUsd * 100),
				image_url: newItemImageUrl || '',
				created_at: Math.floor(Date.now() / 1000)
			};

			let apiSaveSuccess = false;
			try {
				const res = await fetch('/projects/stripe-toddler-admin/api/inventory', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (res.ok) {
					apiSaveSuccess = true;
				} else {
					serverError = `Worker API error (HTTP ${res.status} ${res.statusText}) on POST /api/admin/inventory`;
					formErrorMessage = `Saved item locally in session, but Worker API returned HTTP ${res.status} ${res.statusText}`;
				}
			} catch (apiErr) {
				serverError = `Unable to reach Worker API at ${workerUrl}: ${apiErr.message}`;
				formErrorMessage = `Saved item locally in session, but Worker API is unreachable (${apiErr.message})`;
			}

			// Add to local state regardless of network response so item is immediately usable in UI and label printing
			const existingIndex = inventoryItems.findIndex((i) => i.barcode === payload.barcode);
			if (existingIndex >= 0) {
				inventoryItems[existingIndex] = payload;
			} else {
				inventoryItems = [payload, ...inventoryItems];
			}

			sessionAddedBarcodes.add(payload.barcode);
			sessionAddedBarcodes = new Set(sessionAddedBarcodes);

			selectedBarcodesForPrint.add(payload.barcode);
			selectedBarcodesForPrint = new Set(selectedBarcodesForPrint);

			if (apiSaveSuccess) {
				formSuccessMessage = `Successfully saved ${payload.name} (${payload.barcode}) to Cloudflare Worker!`;
			} else {
				formSuccessMessage = `Saved ${payload.name} (${payload.barcode}) to session print sheet.`;
			}

			// Reset form for next item
			newItemName = '';
			newItemPriceUsd = 5;
			newItemBarcode = 'TOY-NEW-ITEM-' + Date.now().toString().slice(-3);
			imageFile = null;
			imagePreviewUrl = '';
			isEditing = false;
			isUserPromptCustomized = false;
			customAiPrompt = getDefaultPrompt('');

			// Refresh from server if server is active
			await fetchInventory();
		} catch (err) {
			formErrorMessage = `Error saving item: ${err.message}`;
		} finally {
			isSavingItem = false;
		}
	}

	function togglePrintSelection(barcode) {
		if (selectedBarcodesForPrint.has(barcode)) {
			selectedBarcodesForPrint.delete(barcode);
		} else {
			selectedBarcodesForPrint.add(barcode);
		}
		selectedBarcodesForPrint = new Set(selectedBarcodesForPrint);
	}

	function triggerPrint() {
		if (typeof window !== 'undefined') {
			window.print();
		}
	}

	// Filter printable items
	const printableItems = $derived.by(() => {
		if (printSelectionMode === 'session') {
			return inventoryItems.filter((item) => sessionAddedBarcodes.has(item.barcode));
		}
		if (printSelectionMode === 'custom') {
			return inventoryItems.filter((item) => selectedBarcodesForPrint.has(item.barcode));
		}
		return inventoryItems;
	});

	// Calculated Analytics
	const totalRevenueUsd = $derived.by(() => {
		const totalCents = transactions.reduce((acc, t) => acc + (t.amount_cents || 0), 0);
		return (totalCents / 100).toFixed(2);
	});

	const totalItemsSold = $derived.by(() => {
		return transactions.reduce((acc, t) => {
			const subTotal = (t.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
			return acc + subTotal;
		}, 0);
	});

	const averageOrderValueUsd = $derived.by(() => {
		if (transactions.length === 0) return '0.00';
		const totalCents = transactions.reduce((acc, t) => acc + (t.amount_cents || 0), 0);
		return (totalCents / 100 / transactions.length).toFixed(2);
	});
</script>

<svelte:head>
	<title>Stripe Toddler Admin — Inventory & Analytics Dashboard</title>
	<meta
		name="description"
		content="Executive inventory management, Avery barcode label generator, and sales analytics for Stripe Toddler POS."
	/>
</svelte:head>

<div
	class="min-h-screen bg-zinc-950 text-white font-sans selection:bg-green-500 selection:text-black"
>
	<!-- Standard Site Header -->
	<div class="no-print max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2">
		<Header />
	</div>

	<!-- Top Navigation Header -->
	<header
		class="no-print border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-40"
	>
		<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
			<div
				class="flex flex-col md:flex-row md:items-center justify-between py-3 md:py-0 md:h-20 gap-3 md:gap-4"
			>
				<!-- Brand / Logo -->
				<div
					class="flex items-center justify-between md:justify-start gap-2 sm:gap-4 w-full md:w-auto"
				>
					<div class="flex items-center gap-2 sm:gap-3 min-w-0">
						<div
							class="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-green-500 to-blue-600 flex items-center justify-center shadow-lg shadow-green-500/20 shrink-0"
						>
							<BabySolid class="size-5 sm:size-6 text-white" />
						</div>
						<div class="min-w-0">
							<h1
								class="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-1.5 truncate"
							>
								<span class="truncate">Stripe Toddler Admin</span>
							</h1>
							<p class="text-[11px] sm:text-xs text-zinc-400 truncate">
								Inventory & Barcode Dashboard
							</p>
						</div>
					</div>
				</div>

				<!-- Navigation Tabs -->
				<nav
					class="flex items-center justify-around sm:justify-start gap-1 bg-zinc-950 p-1 sm:p-1.5 rounded-xl border border-zinc-800 w-full md:w-auto overflow-x-auto"
				>
					<button
						onclick={() => (activeTab = 'inventory')}
						class="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex-1 md:flex-initial text-center whitespace-nowrap {activeTab ===
						'inventory'
							? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
							: 'text-zinc-400 hover:text-white hover:bg-zinc-900'}"
					>
						<BoxSolid class="size-3.5 sm:size-4 text-green-400 shrink-0" />
						<span>Inventory</span>
					</button>

					<button
						onclick={() => (activeTab = 'analytics')}
						class="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex-1 md:flex-initial text-center whitespace-nowrap {activeTab ===
						'analytics'
							? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
							: 'text-zinc-400 hover:text-white hover:bg-zinc-900'}"
					>
						<ChartLineSolid class="size-3.5 sm:size-4 text-blue-400 shrink-0" />
						<span>Sales History</span>
					</button>
				</nav>
			</div>
		</div>
	</header>

	<!-- Main Container -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 no-print">
		<!-- Server API Error Alert Banner -->
		{#if serverError}
			<div
				class="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between shadow-lg"
			>
				<div class="flex items-center gap-3">
					<div class="size-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></div>
					<div>
						<h4 class="font-bold text-sm text-red-400">Worker Server Notice</h4>
						<p class="text-xs text-red-300/90">{serverError}</p>
					</div>
				</div>
				<button
					onclick={() => (serverError = '')}
					class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors shrink-0"
				>
					Dismiss
				</button>
			</div>
		{/if}
		<!-- TAB 1: INVENTORY MANAGEMENT & BARCODE GENERATOR -->
		{#if activeTab === 'inventory'}
			<div class="space-y-8">
				<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
					<!-- Left Column: Add / Edit Item Form -->
					<div
						id="inventory-item-form"
						class="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between scroll-mt-24"
					>
						<div class="space-y-6">
							<div class="border-b border-zinc-800 pb-4">
								<h2 class="text-lg font-bold text-white flex items-center gap-2">
									<PlusSolid class="size-5 text-green-400" />
									{#if isEditing}
										<span>Edit Inventory Item</span>
										<span
											class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono"
											>{newItemBarcode}</span
										>
									{:else}
										<span>Add New Inventory Item</span>
									{/if}
								</h2>
								<p class="text-xs text-zinc-400">
									{#if isEditing}
										Updating existing item record for barcode <span class="font-mono text-white"
											>{newItemBarcode}</span
										>.
									{:else}
										Associate an item image, price, and auto-generate a barcode string.
									{/if}
								</p>
							</div>

							{#if formSuccessMessage}
								<div
									class="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium flex items-center gap-2"
								>
									<CheckSolid class="size-4 shrink-0" />
									<span>{formSuccessMessage}</span>
								</div>
							{/if}

							{#if formErrorMessage}
								<div
									class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2"
								>
									<span>{formErrorMessage}</span>
								</div>
							{/if}

							<!-- Item Name -->
							<div>
								<label
									for="item-name"
									class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2"
									>Item Name</label
								>
								<input
									id="item-name"
									type="text"
									bind:value={newItemName}
									oninput={handleNameChange}
									placeholder="e.g. Red Fire Engine Truck"
									class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 text-sm font-medium"
								/>
							</div>

							<!-- Price USD -->
							<div>
								<label
									for="item-price"
									class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2"
									>Price (USD Integer)</label
								>
								<div class="relative">
									<span class="absolute left-4 top-3 text-zinc-400 text-sm font-bold">$</span>
									<input
										id="item-price"
										type="number"
										min="1"
										step="1"
										bind:value={newItemPriceUsd}
										placeholder="5"
										class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 text-sm font-bold"
									/>
								</div>
							</div>

							<!-- Item Image Upload & AI Generation -->
							<div>
								<div class="flex items-center justify-between mb-2">
									<label
										for="image-file"
										class="block text-xs font-bold text-zinc-300 uppercase tracking-wider"
										>Item Image</label
									>

									<button
										type="button"
										onclick={handleGenerateAiImage}
										disabled={isGeneratingAiImage || (!newItemName && !customAiPrompt)}
										class="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold text-xs rounded-xl border border-purple-500/30 transition-all flex items-center gap-1.5 disabled:opacity-40"
									>
										{#if isGeneratingAiImage}
											<RotateSolid class="size-3.5 animate-spin text-purple-400" />
											<span>Generating AI Image...</span>
										{:else}
											<WandMagicSparklesSolid class="size-3.5 text-purple-400" />
											<span>Generate Image with Cloudflare AI</span>
										{/if}
									</button>
								</div>

								<!-- Custom Cloudflare AI Prompt Box -->
								<div
									class="mb-3 p-3 bg-zinc-950/90 rounded-2xl border border-purple-500/20 space-y-2.5 shadow-inner"
								>
									<div class="flex items-center justify-between">
										<label
											for="custom-prompt"
											class="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5"
										>
											<WandMagicSparklesSolid class="size-3.5 text-purple-400" />
											Cloudflare AI Image Prompt (Editable)
										</label>
										<button
											type="button"
											onclick={() => {
												isUserPromptCustomized = false;
												customAiPrompt = getDefaultPrompt(newItemName);
											}}
											class="text-[10px] text-zinc-400 hover:text-purple-300 font-mono underline transition-colors"
										>
											Reset to Default
										</button>
									</div>

									<textarea
										id="custom-prompt"
										rows="4"
										bind:value={customAiPrompt}
										oninput={() => (isUserPromptCustomized = true)}
										placeholder={getDefaultPrompt(newItemName)}
										class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-purple-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-mono leading-relaxed min-h-[110px] resize-y shadow-inner"
									></textarea>

									<div
										class="flex items-center justify-between text-[10px] text-zinc-500 font-mono px-0.5"
									>
										<span>Edit words directly above to tweak lighting, style, or background.</span>
										<span>{customAiPrompt.length} chars</span>
									</div>

									<div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-800/80">
										<span class="text-[10px] text-zinc-500 font-bold mr-1">Style Presets:</span>
										<button
											type="button"
											onclick={() => {
												isUserPromptCustomized = true;
												customAiPrompt = `Professional retail product photograph of ${newItemName || 'item'}, as seen in a shop, clean white background, sharp focus, commercial product photography lighting, photorealistic`;
											}}
											class="px-2.5 py-1 bg-zinc-900 hover:bg-purple-900/40 text-[10px] text-zinc-300 hover:text-purple-200 rounded-lg border border-zinc-800 transition-colors"
										>
											📸 Studio Product
										</button>
										<button
											type="button"
											onclick={() => {
												isUserPromptCustomized = true;
												customAiPrompt = `Authentic handcrafted wooden ${newItemName || 'item'}, natural wood grain texture, soft studio lighting, clean background`;
											}}
											class="px-2.5 py-1 bg-zinc-900 hover:bg-purple-900/40 text-[10px] text-zinc-300 hover:text-purple-200 rounded-lg border border-zinc-800 transition-colors"
										>
											🪵 Handcrafted Wood
										</button>
										<button
											type="button"
											onclick={() => {
												isUserPromptCustomized = true;
												customAiPrompt = `Real soft plush fabric ${newItemName || 'item'}, cozy warm studio lighting, clean isolated background, high detail`;
											}}
											class="px-2.5 py-1 bg-zinc-900 hover:bg-purple-900/40 text-[10px] text-zinc-300 hover:text-purple-200 rounded-lg border border-zinc-800 transition-colors"
										>
											🧸 Soft Plush
										</button>
										<button
											type="button"
											onclick={() => {
												isUserPromptCustomized = true;
												customAiPrompt = `Sleek minimalist render of ${newItemName || 'item'}, smooth pastel colors, soft studio shadows, white background`;
											}}
											class="px-2.5 py-1 bg-zinc-900 hover:bg-purple-900/40 text-[10px] text-zinc-300 hover:text-purple-200 rounded-lg border border-zinc-800 transition-colors"
										>
											🎨 Minimalist
										</button>
									</div>
								</div>

								<div
									class="border-2 border-dashed border-zinc-800 rounded-2xl p-4 text-center bg-zinc-950/50 hover:border-zinc-700 transition-colors"
								>
									{#if imagePreviewUrl}
										<div
											class="relative group mx-auto w-36 h-36 rounded-2xl overflow-hidden mb-3 border border-zinc-700 bg-zinc-900 shadow-lg cursor-zoom-in"
											onclick={() =>
												handleZoomImage(
													imagePreviewUrl,
													newItemName || 'Preview Image',
													`$${newItemPriceUsd} USD`
												)}
											role="button"
											tabindex="0"
											onkeydown={(e) =>
												e.key === 'Enter' &&
												handleZoomImage(imagePreviewUrl, newItemName || 'Preview Image')}
										>
											<img
												src={imagePreviewUrl}
												alt="Preview"
												class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
											<div
												class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity p-2"
											>
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														handleZoomImage(
															imagePreviewUrl,
															newItemName || 'Preview Image',
															`$${newItemPriceUsd} USD`
														);
													}}
													class="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow"
												>
													<MagnifyingGlassPlusSolid class="size-3 text-white" />
													<span>Zoom Image</span>
												</button>
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														imageFile = null;
														imagePreviewUrl = '';
														newItemImageUrl = '';
													}}
													class="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold rounded-lg transition-colors shadow"
												>
													Remove
												</button>
											</div>
										</div>
									{:else}
										<UploadSolid class="size-8 text-zinc-500 mx-auto mb-2" />
										<p class="text-xs text-zinc-400 font-medium mb-1">
											Click to select image asset or generate with Cloudflare AI
										</p>
										<p class="text-[10px] text-zinc-600">JPEG, PNG, or AI-generated data URL</p>
									{/if}
									<input
										id="image-file"
										type="file"
										accept="image/*"
										onchange={handleFileSelect}
										class="mt-2 text-xs text-zinc-400 block w-full text-center file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
									/>
								</div>
							</div>

							<!-- Generated Barcode String & Live SVG -->
							<div>
								<label
									for="barcode-string"
									class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2"
									>Generated Barcode String</label
								>
								<input
									id="barcode-string"
									type="text"
									bind:value={newItemBarcode}
									placeholder="TOY-FIRE-ENGINE-001"
									class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-green-400 font-mono text-xs font-bold tracking-wider mb-3 focus:outline-none focus:border-green-500"
								/>

								<!-- Live Scannable Code Preview -->
								<div
									class="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col items-center"
								>
									<p class="text-[10px] uppercase font-bold text-zinc-500 mb-2">
										Live Scannable Preview ({barcodeFormat === 'qr' ? '2D QR Code' : '1D Barcode'})
									</p>
									{#if barcodeFormat === 'qr'}
										<QrCodeSvg code={newItemBarcode || 'TOY-001'} size={56} showText={true} />
									{:else}
										<BarcodeSvg code={newItemBarcode || 'TOY-001'} height={40} showText={true} />
									{/if}
								</div>
							</div>
						</div>

						<!-- Action Button -->
						<div class="pt-6 border-t border-zinc-800 space-y-2">
							<button
								onclick={handleSaveItem}
								disabled={isSavingItem}
								class="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-[0.98] text-black font-extrabold text-base transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
							>
								{#if isSavingItem}
									<RotateSolid class="size-5 animate-spin" />
									<span>Saving to Worker KV...</span>
								{:else if isEditing}
									<CheckSolid class="size-5" />
									<span>Update Item ({newItemBarcode})</span>
								{:else}
									<CheckSolid class="size-5" />
									<span>Save & Generate Item</span>
								{/if}
							</button>

							{#if isEditing}
								<button
									onclick={handleCancelEdit}
									class="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all text-center"
								>
									Cancel Edit / Add New Item
								</button>
							{/if}
						</div>
					</div>

					<!-- Right Column: Printable Avery Label Preview -->
					<div
						class="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
					>
						<div>
							<div
								class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4"
							>
								<div>
									<h2 class="text-lg font-bold text-white flex items-center gap-2">
										<FileLinesSolid class="size-5 text-blue-400" />
										Print Preview (Avery 1" x 2-5/8" Labels)
									</h2>
									<p class="text-xs text-zinc-400">
										Formatted for standard Avery 5160 30-up address label sheets.
									</p>
								</div>

								<button
									onclick={triggerPrint}
									class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md flex items-center gap-2 justify-center shrink-0"
								>
									<FileLinesSolid class="size-4" />
									<span>PRINT SHEET</span>
								</button>
							</div>

							<!-- Code Format & Print Selection Controls -->
							<div
								class="my-4 p-3 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
							>
								<div class="flex items-center gap-2">
									<span class="font-bold text-zinc-400 uppercase tracking-wider">Format:</span>
									<button
										onclick={() => (barcodeFormat = 'qr')}
										class="px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 {barcodeFormat ===
										'qr'
											? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
											: 'text-zinc-400 hover:text-white'}"
									>
										<span>📱 2D QR Code</span>
									</button>
									<button
										onclick={() => (barcodeFormat = '1d')}
										class="px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 {barcodeFormat ===
										'1d'
											? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
											: 'text-zinc-400 hover:text-white'}"
									>
										<span>📊 1D Barcode</span>
									</button>
								</div>

								<div class="flex items-center gap-2">
									<span class="font-bold text-zinc-400 uppercase tracking-wider"
										>Print selection:</span
									>
									<button
										onclick={() => (printSelectionMode = 'session')}
										class="px-3 py-1.5 rounded-lg font-semibold transition-all {printSelectionMode ===
										'session'
											? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
											: 'text-zinc-400 hover:text-white'}"
									>
										Added this session ({sessionAddedBarcodes.size})
									</button>
									<button
										onclick={() => (printSelectionMode = 'all')}
										class="px-3 py-1.5 rounded-lg font-semibold transition-all {printSelectionMode ===
										'all'
											? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
											: 'text-zinc-400 hover:text-white'}"
									>
										All Items ({inventoryItems.length})
									</button>
									<button
										onclick={() => (printSelectionMode = 'custom')}
										class="px-3 py-1.5 rounded-lg font-semibold transition-all {printSelectionMode ===
										'custom'
											? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
											: 'text-zinc-400 hover:text-white'}"
									>
										Custom selection ({selectedBarcodesForPrint.size})
									</button>
								</div>
							</div>

							<!-- Label Grid Preview (Avery 3-column format) -->
							<div
								class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 max-h-[500px] overflow-y-auto"
							>
								{#if printableItems.length === 0}
									<div class="py-12 text-center text-zinc-500 text-xs">
										No items selected for print sheet.
									</div>
								{:else}
									<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
										{#each printableItems as item}
											<div
												class="relative bg-white text-black p-2.5 rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between items-center h-28 text-center group"
											>
												{#if printSelectionMode === 'custom'}
													<input
														type="checkbox"
														checked={selectedBarcodesForPrint.has(item.barcode)}
														onchange={() => togglePrintSelection(item.barcode)}
														class="absolute top-1.5 right-1.5 size-4 accent-blue-600 rounded cursor-pointer"
													/>
												{/if}

												<div
													class="w-full flex items-center justify-between text-[11px] font-extrabold border-b border-gray-200 pb-1"
												>
													<span class="truncate pr-1 text-black font-rounded">{item.name}</span>
													<span class="text-green-700 font-bold shrink-0"
														>${(item.price_cents / 100).toFixed(0)}</span
													>
												</div>

												<div class="w-full my-1 flex justify-center">
													{#if barcodeFormat === 'qr'}
														<QrCodeSvg code={item.barcode} size={42} showText={false} />
													{:else}
														<BarcodeSvg code={item.barcode} height={32} showText={false} />
													{/if}
												</div>

												<span class="text-[9px] font-mono font-bold tracking-tight text-gray-700"
													>{item.barcode}</span
												>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Existing Catalog Section -->
				<div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
					<div class="mb-6">
						<h3 class="text-lg font-bold text-white flex items-center gap-2">
							<BarcodeSolid class="size-5 text-green-400" />
							Current Inventory Catalog
						</h3>
						<p class="text-xs text-zinc-400">
							Items stored in KV database powering the toddler POS iPad app.
						</p>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{#if inventoryItems.length === 0}
							<div
								class="col-span-full py-12 text-center bg-zinc-950/50 border border-dashed border-zinc-800 rounded-2xl p-6"
							>
								<TagSolid class="size-10 text-zinc-600 mx-auto mb-3" />
								<h4 class="text-base font-bold text-white mb-1">No Inventory Items Found</h4>
								<p class="text-xs text-zinc-400 max-w-md mx-auto">
									No items in database. Add an item using the form above, or check your API key in
									Settings.
								</p>
							</div>
						{:else}
							{#each inventoryItems as item}
								<div
									class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors"
								>
									<div>
										<div
											class="relative group h-36 bg-zinc-900 rounded-xl overflow-hidden mb-3 border border-zinc-800 flex items-center justify-center {item.image_url
												? 'cursor-zoom-in'
												: ''}"
											onclick={() => {
												if (item.image_url) {
													handleZoomImage(
														item.image_url,
														item.name,
														`$${(item.price_cents / 100).toFixed(2)} USD • ${item.barcode}`
													);
												}
											}}
											role="button"
											tabindex="0"
											onkeydown={(e) =>
												e.key === 'Enter' &&
												item.image_url &&
												handleZoomImage(item.image_url, item.name)}
										>
											{#if item.image_url}
												<img
													src={item.image_url}
													alt={item.name}
													class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
												/>
												<div
													class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
												>
													<span
														class="px-2.5 py-1 bg-black/80 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 border border-zinc-700 shadow"
													>
														<MagnifyingGlassPlusSolid class="size-3 text-purple-400" />
														<span>Zoom Image</span>
													</span>
												</div>
											{:else}
												<TagSolid class="size-8 text-zinc-600" />
											{/if}
										</div>

										<h4 class="font-bold text-white text-sm line-clamp-1">{item.name}</h4>
										<p class="text-xs font-mono text-green-400 font-bold mt-0.5">
											${(item.price_cents / 100).toFixed(2)} USD
										</p>
										<p class="text-[10px] font-mono text-zinc-500 mt-1 truncate">{item.barcode}</p>
									</div>

									<div class="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
										{#if barcodeFormat === 'qr'}
											<QrCodeSvg code={item.barcode} size={32} showText={false} />
										{:else}
											<BarcodeSvg code={item.barcode} height={24} showText={false} />
										{/if}
										<div class="flex items-center gap-1.5">
											<button
												onclick={() => handleEditItem(item)}
												class="text-xs text-blue-400 hover:text-blue-300 font-bold px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
											>
												Edit
											</button>
											<button
												onclick={() => handleDeleteItem(item.barcode, item.name)}
												class="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-1"
												title="Delete Item"
											>
												<TrashCanSolid class="size-3 text-red-400" />
												<span>Delete</span>
											</button>
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- TAB 2: SALES HISTORY & ANALYTICS -->
		{#if activeTab === 'analytics'}
			<div class="space-y-8">
				<!-- Stat Cards -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
						<p class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
							Total Sales Revenue
						</p>
						<h3 class="text-3xl font-extrabold text-green-400">${totalRevenueUsd}</h3>
						<p class="text-[10px] text-zinc-500 mt-2">Logged in D1 SQLite Database</p>
					</div>

					<div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
						<p class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
							Total Transactions
						</p>
						<h3 class="text-3xl font-extrabold text-blue-400">{transactions.length}</h3>
						<p class="text-[10px] text-zinc-500 mt-2">Card present transactions</p>
					</div>

					<div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
						<p class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Items Sold</p>
						<h3 class="text-3xl font-extrabold text-yellow-400">{totalItemsSold}</h3>
						<p class="text-[10px] text-zinc-500 mt-2">Toys purchased by toddlers</p>
					</div>

					<div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
						<p class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
							Average Order Value
						</p>
						<h3 class="text-3xl font-extrabold text-purple-400">${averageOrderValueUsd}</h3>
						<p class="text-[10px] text-zinc-500 mt-2">Per transaction</p>
					</div>
				</div>

				<!-- Transactions Table -->
				<div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h3 class="text-lg font-bold text-white flex items-center gap-2">
								<ChartLineSolid class="size-5 text-blue-400" />
								Store Sales History
							</h3>
							<p class="text-xs text-zinc-400">
								Historical transaction logs from Stripe Reader M2 sales.
							</p>
						</div>
						<button
							onclick={fetchAnalytics}
							disabled={isLoadingAnalytics}
							class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 flex items-center gap-2"
						>
							<RotateSolid class="size-3.5 {isLoadingAnalytics ? 'animate-spin' : ''}" />
							<span>Reload Data</span>
						</button>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full text-left text-xs">
							<thead
								class="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800"
							>
								<tr>
									<th class="p-3">Timestamp</th>
									<th class="p-3">Transaction ID</th>
									<th class="p-3">Payment Intent</th>
									<th class="p-3">Status</th>
									<th class="p-3">Items</th>
									<th class="p-3 text-right">Total Amount</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-800 text-zinc-300">
								{#if transactions.length === 0}
									<tr>
										<td colspan="6" class="py-12 text-center text-zinc-500">
											<ChartLineSolid class="size-8 text-zinc-600 mx-auto mb-2" />
											<p class="text-sm font-semibold text-zinc-400">
												No Sales Transactions Recorded Yet
											</p>
											<p class="text-xs text-zinc-500 mt-1">
												Transactions processed on the Toddler POS iPad app will appear here in real
												time.
											</p>
										</td>
									</tr>
								{:else}
									{#each transactions as t}
										<tr class="hover:bg-zinc-950/50">
											<td class="p-3 font-mono text-zinc-400"
												>{new Date(t.created_at * 1000).toLocaleString()}</td
											>
											<td class="p-3 font-mono text-zinc-300 font-semibold"
												>{t.transaction_id.substring(0, 8)}...</td
											>
											<td class="p-3 font-mono text-blue-400">{t.payment_intent_id}</td>
											<td class="p-3">
												<span
													class="px-2 py-0.5 rounded-full font-mono text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 uppercase font-bold"
												>
													{t.status}
												</span>
											</td>
											<td class="p-3">
												<div class="space-y-1">
													{#each t.items || [] as item}
														<div class="text-[11px] text-zinc-300">
															<span class="font-bold text-white">{item.quantity}x</span>
															{item.name} (${(item.price_cents / 100).toFixed(2)})
														</div>
													{/each}
												</div>
											</td>
											<td class="p-3 text-right font-bold text-green-400 font-mono text-sm"
												>${(t.amount_cents / 100).toFixed(2)}</td
											>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- Printable Avery 1" x 2-5/8" Labels Sheet (ONLY Visible in Browser Print Dialog) -->
	<div class="print-only-sheet hidden">
		<div class="avery-grid">
			{#each printableItems as item}
				<div class="avery-label">
					<div
						style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 10pt; font-weight: bold;"
					>
						<span
							style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 75%;"
							>{item.name}</span
						>
						<span>${(item.price_cents / 100).toFixed(0)}</span>
					</div>
					<div style="width: 100%; margin: 2px 0; display: flex; justify-content: center;">
						{#if barcodeFormat === 'qr'}
							<QrCodeSvg code={item.barcode} size={44} showText={false} />
						{:else}
							<BarcodeSvg code={item.barcode} height={28} showText={false} />
						{/if}
					</div>
					<div style="font-family: monospace; font-size: 8pt; font-weight: bold;">
						{item.barcode}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Image Zoom Lightbox Modal -->
	{#if zoomedImage}
		<div
			class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 no-print"
			onclick={handleCloseZoom}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Escape' && handleCloseZoom()}
		>
			<div
				class="relative max-w-4xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center overflow-hidden"
				onclick={(e) => e.stopPropagation()}
				role="document"
			>
				<button
					onclick={handleCloseZoom}
					class="absolute top-4 right-4 z-10 p-2.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full transition-colors border border-zinc-700/50 shadow-lg cursor-pointer"
					title="Close Zoom (Esc)"
				>
					<XmarkSolid class="size-5" />
				</button>

				<div
					class="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 p-3 mb-4 shadow-inner"
				>
					<img
						src={zoomedImage.url}
						alt={zoomedImage.title || 'Zoomed Item Image'}
						class="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300 hover:scale-105"
					/>
				</div>

				{#if zoomedImage.title || zoomedImage.subtitle}
					<div class="w-full text-center space-y-1">
						{#if zoomedImage.title}
							<h3 class="text-lg font-extrabold text-white">{zoomedImage.title}</h3>
						{/if}
						{#if zoomedImage.subtitle}
							<p class="text-xs font-mono text-green-400 font-bold">{zoomedImage.subtitle}</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Footer -->
	<div class="no-print">
		<Footer />
	</div>
</div>

<!-- Printable Avery 1" x 2-5/8" Label Styles -->
<style>
	@media print {
		/* Hide everything outside the print area */
		:global(body) {
			background: white !important;
			color: black !important;
		}
		.no-print {
			display: none !important;
		}
		.print-only-sheet {
			display: block !important;
			width: 100% !important;
			margin: 0 !important;
			padding: 0 !important;
		}
		/* Avery 5160 format: 3 columns, 10 rows per 8.5x11 sheet */
		@page {
			size: letter portrait;
			margin: 0.5in 0.1875in 0.5in 0.1875in;
		}
		.avery-grid {
			display: grid !important;
			grid-template-columns: repeat(3, 2.625in) !important;
			gap: 0 0.125in !important;
			row-gap: 0 !important;
		}
		.avery-label {
			width: 2.625in !important;
			height: 1in !important;
			padding: 0.05in 0.1in !important;
			box-sizing: border-box !important;
			overflow: hidden !important;
			display: flex !important;
			flex-direction: column !important;
			justify-content: space-between !important;
			align-items: center !important;
			border: 1px dashed #ccc !important;
			page-break-inside: avoid !important;
		}
	}
</style>
