<script>
	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		href = null,
		children,
		onclick = null,
		...rest
	} = $props();

	const variants = {
		primary:
			'bg-gray-800 hover:bg-gray-700 text-white border border-green-400 hover:border-green-300',
		secondary:
			'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-600 hover:border-gray-500',
		danger: 'bg-red-600 hover:bg-red-700 text-white',
		success: 'bg-green-600 hover:bg-green-700 text-white',
		warning: 'bg-yellow-600 hover:bg-yellow-700 text-white'
	};

	const sizes = {
		sm: 'py-1 px-3 text-sm',
		md: 'py-2 px-4',
		lg: 'py-3 px-6 text-lg'
	};

	const classes = `font-bold rounded ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} no-underline not-prose inline-block`;
</script>

{#if href}
	<a {href} class={classes} {...rest}>
		{@render children?.()}
	</a>
{:else}
	<button {type} {disabled} class={classes} {onclick} {...rest}>
		{@render children?.()}
	</button>
{/if}
