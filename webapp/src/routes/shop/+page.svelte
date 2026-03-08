<!-- webapp/src/routes/shop/+page.svelte -->
<script>
    import Navbar from '$lib/components/Navbar.svelte';
    import Header from '$lib/components/Header.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import ShopDisclaimer from '$lib/components/ShopDisclaimer.svelte';
    import ProductCard from '$lib/components/ProductCard.svelte';
    import { onMount } from 'svelte';

    /** @type {{ data: any }} */
    let { data } = $props();

    let selectedCategory = $state('All');
    const categories = $derived(['All', ...new Set(data.products.map(p => p.category))]);

    const filteredProducts = $derived(
        selectedCategory === 'All' 
            ? data.products 
            : data.products.filter(p => p.category === selectedCategory)
    );

    let BackgroundComponent = $state();

    onMount(async () => {
        const module = await import('$lib/components/Background.svelte');
        BackgroundComponent = module.default;
    });
</script>

<svelte:head>
    <title>Shop | Fintech Nick</title>
    <meta name="description" content="Virtual shop for testing agentic e-commerce workflows." />
</svelte:head>

{#if BackgroundComponent}
    <BackgroundComponent />
{/if}

<Header />

<Navbar />

<div class="min-h-screen pt-24 pb-12 px-4 md:px-6 max-w-7xl mx-auto">
    <!-- Header Section -->
    <header class="mb-12">
        <h1 class="text-4xl md:text-6xl font-black tracking-tighter text-white mb-2 font-mono">
            FINTECH NICK <span class="text-green-400">VIRTUAL SHOP</span>
        </h1>
        <p class="text-xl text-green-400/80 font-mono mb-8 uppercase tracking-widest">
            Agentic E-Commerce Simulation
        </p>
        
        <ShopDisclaimer />
    </header>

    <div class="flex flex-col md:flex-row gap-8">
        <!-- Sidebar / Filter -->
        <aside class="w-full md:w-48 flex-shrink-0">
            <h2 class="text-xs uppercase tracking-[0.2em] text-white/40 font-bold mb-4 font-mono">Categories</h2>
            <nav class="flex flex-row md:flex-col gap-2 flex-wrap pb-4 md:pb-0">
                {#each categories as category}
                    <button 
                        onclick={() => selectedCategory = category}
                        class={`px-4 py-2 text-left font-mono text-sm transition-all border-l-2 whitespace-nowrap
                            ${selectedCategory === category 
                                ? 'border-green-400 text-green-400 bg-green-400/10' 
                                : 'border-white/10 text-white/60 hover:text-white hover:border-white/40'}`}
                    >
                        {category}
                    </button>
                {/each}
            </nav>
        </aside>

        <!-- Product Grid -->
        <main class="flex-grow">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each filteredProducts as product (product.id)}
                    <div class="h-full">
                        <ProductCard {product} />
                    </div>
                {/each}
            </div>
            
            {#if filteredProducts.length === 0}
                <div class="py-24 text-center">
                    <p class="text-white/40 font-mono">No products found in this category.</p>
                </div>
            {/if}
        </main>
    </div>
</div>

<Footer />
