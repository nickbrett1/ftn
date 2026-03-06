<!-- webapp/src/lib/components/ProductCard.svelte -->
<script>
    import Card from './Card.svelte';
    import Button from './Button.svelte';

    /** @type {{ product: any }} */
    let { product } = $props();

    const formattedPrice = $derived(new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: product.currency.toUpperCase()
    }).format(product.price / 100));
</script>

<Card disableHoverGlow={true} class="h-full">
    <div class="flex flex-col h-full w-full">
        <div class="relative w-full pt-[66%] mb-4 overflow-hidden rounded-md border border-green-400/30">
            <img 
                src={product.image} 
                alt={product.name} 
                class="absolute inset-0 w-full h-full object-cover transition-all duration-500"
            />
        </div>
        
        <div class="flex-grow">
            <span class="text-[10px] uppercase tracking-widest text-green-400/60 font-mono mb-1 block">
                {product.category}
            </span>
            <h3 class="text-xl font-bold text-white mb-2 font-mono">{product.name}</h3>
            <p class="text-sm text-white/70 mb-4 line-clamp-2">{product.description}</p>
        </div>

        <div class="mt-auto pt-4 flex items-center justify-between border-t border-green-400/20">
            <span class="text-xl font-bold text-green-400 font-mono">{formattedPrice}</span>
            <form action="?/checkout" method="POST">
                <input type="hidden" name="productId" value={product.id} />
                <Button type="submit" size="sm">Buy Now</Button>
            </form>
        </div>
    </div>
</Card>
