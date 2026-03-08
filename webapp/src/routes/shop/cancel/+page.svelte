<!-- webapp/src/routes/shop/cancel/+page.svelte -->
<script>
    import Navbar from '$lib/components/Navbar.svelte';
    import Header from '$lib/components/Header.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import Button from '$lib/components/Button.svelte';
    import { onMount } from 'svelte';

    let BackgroundComponent = $state();

    onMount(async () => {
        const module = await import('$lib/components/Background.svelte');
        BackgroundComponent = module.default;
    });
</script>

<svelte:head>
    <title>Cancelled | Fintech Nick Shop</title>
</svelte:head>

{#if BackgroundComponent}
    <svelte:component this={BackgroundComponent} />
{/if}

<Header />

<Navbar />

<div class="min-h-screen flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-red-900/10 border border-red-500/50 p-8 rounded-lg backdrop-blur-md text-center">
        <div class="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-500">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>
        
        <h1 class="text-3xl font-black text-white mb-2 font-mono uppercase tracking-tighter">
            PAYMENT <span class="text-red-500">CANCELLED</span>
        </h1>
        
        <p class="text-white/70 mb-8 font-mono text-sm uppercase tracking-wide">
            The transaction was cancelled. No charges were made.
        </p>
        
        <div class="space-y-4">
            <Button href="/shop" variant="secondary" class="w-full">Return to Shop</Button>
            <p class="text-[10px] text-white/40 font-mono uppercase">
                Cancellation event captured for workflow testing.
            </p>
        </div>
    </div>
</div>

<Footer />
