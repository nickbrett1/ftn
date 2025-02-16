<script>
	import { goto } from '$app/navigation';

	import { ChevronDownSolid, ChevronUpSolid, LinkedinInBrands, EnvelopeRegular } from 'svelte-awesome-icons';

	let isOpen = $state(false);
</script>

<div class="w-full bg-black/90 p-2 flex flex-row">
	<button
		onclick={() => {
			goto('/');
		}}
		aria-label="Home"
		class="text-white whitespace-nowrap py-1 text-2xl tracking-wide float-left
			[text-shadow:_0_0_15px_#fff,_0_0_20px_#0fa,_0_0_30px_#0fa,_0_0_40px_#0fa,_0_0_80px_#0fa,_0_0_90px_#0fa,_0_0_100px_#0fa,_0_0_150px_#0fa]"
	>
		Fintech Nick
	</button>

	<nav class="flex flex-row-reverse grow">
		<div class="text-white px-2 hover:text-green-300 fill-white hover:fill-green-300 flex">
			<div class="flex items-center">
				<button class="flex" onclick={() => (isOpen = !isOpen)}>
					<div class="px-1">Projects</div>
					{#if isOpen}
						<ChevronUpSolid />
					{:else}
						<ChevronDownSolid />
					{/if}
				</button>
				{#if isOpen}
					<div class="absolute right-0 top-10 w-fit bg-black text-white rounded z-10">
						{#if false}
							<a href="/projects/galactic" class="block px-4 py-2 hover:bg-green-800"
								>Galactic Unicorn</a
							>
							<a href="/projects/makingof" class="block px-4 py-2 hover:bg-green-800">Making Of</a>
							<a href="/projects/3d" class="block px-4 py-2 hover:bg-green-800">3D</a>
							<a href="/projects/chase" class="block px-4 py-2 hover:bg-green-800">Chase Monthly</a>
							<a href="/projects/product" class="block px-4 py-2 hover:bg-green-800"
								>Product Ideas</a
							>
							<a href="/projects/blog" class="block px-4 py-2 hover:bg-green-800">Blog</a>
						{/if}

						<a href="/projects" class="block px-4 py-2 hover:bg-green-800">Coming Soon...</a>
						{#await import('./Login.svelte') then Login}
							<Login.default
								class="block px-4 py-2  hover:bg-green-800 w-full text-left"
								loggedInText="Configure"
								loggedOutText="Admin"
							/>
						{/await}
					</div>
				{/if}
			</div>
		</div>

		<a
			href="mailto:nick@fintechnick.com"
			class=" text-white hover:text-green-300 flex items-center"
		>
			<EnvelopeRegular aria-label="Email" />
		</a>
		<a
			href="https://www.linkedin.com/in/nick-brett/"
			class=" bg-black text-white hover:text-sky-600 mr-2 flex items-center"
			target="_blank"
			rel="noopener noreferrer"
		>
			<LinkedinInBrands aria-label="LinkedIn" />
		</a>
	</nav>
</div>
