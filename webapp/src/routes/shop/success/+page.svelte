<!-- webapp/src/routes/shop/success/+page.svelte -->
<script>
    import Navbar from '$lib/components/Navbar.svelte';
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
    <title>Success | Fintech Nick Shop</title>
</svelte:head>

{#if BackgroundComponent}
    <svelte:component this={BackgroundComponent} />
{/if}

<Navbar />

<div class="min-h-screen flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-green-900/20 border border-green-400 p-8 rounded-lg backdrop-blur-md text-center">
        <div class="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-400/20 text-green-400">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
        </div>
        
        <h1 class="text-3xl font-black text-white mb-2 font-mono uppercase tracking-tighter">
            PAYMENT <span class="text-green-400">SUCCESSFUL</span>
        </h1>
        
        <p class="text-white/70 mb-8 font-mono text-sm uppercase tracking-wide">
            Your mock transaction was processed successfully. This is exactly what an agent would see after completing a purchase.
        </p>
        
        <div class="space-y-4">
            <Button href="/shop" class="w-full">Back to Shop</Button>
            <p class="text-[10px] text-white/40 font-mono uppercase">
                Transaction validated for agentic workflow testing.
            </p>
        </div>
    </div>
</div>

<Footer />
