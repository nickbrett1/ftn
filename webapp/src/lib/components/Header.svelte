<script>
	import ChevronDown from './svg/ChevronDown.svelte';
	import ChevronUp from './svg/ChevronUp.svelte';
	import LinkedIn from './svg/LinkedIn.svelte';
	import Email from './svg/Email.svelte';

	let isOpen = false;
</script>

<div class="w-full bg-black/90 p-2 flex flex-row">
	<a
		href="https://fintechnick.com"
		aria-label="Home"
		class="whitespace-nowrap py-1 text-2xl tracking-wide float-left"
		style="color: #fff;
	text-shadow: 
		0 0 15px #fff,
		0 0 20px #0fa,
		0 0 30px #0fa,
		0 0 40px #0fa,
		0 0 80px #0fa,
		0 0 90px #0fa,
		0 0 100px #0fa,
		0 0 150px #0fa;
		"
	>
		Fintech Nick
	</a>

	<nav class="flex flex-row-reverse grow">
		<div class="text-white px-2 hover:text-green-300 fill-white hover:fill-green-300 flex">
			<div class="flex items-center">
				<button class="flex" on:click={() => (isOpen = !isOpen)}>
					<div class="px-1">Projects</div>
					<svelte:component this={isOpen ? ChevronUp : ChevronDown} />
				</button>
				{#if isOpen}
					<div class="absolute right-0 top-10 w-64 bg-black text-white rounded z-10">
						<div class=" hover:bg-green-800">
							<a href="/projects/galactic" class="block px-4 py-2">Galactic Unicorn</a>
						</div>
						<a href="/projects/makingof" class="block px-4 py-2 hover:bg-green-800">Making Of</a>
						<a href="/projects/3d" class="block px-4 py-2 hover:bg-green-800">3D</a>
						<a href="/projects/chase" class="block px-4 py-2 hover:bg-green-800">Chase Monthly</a>
						<a href="/projects/product" class="block px-4 py-2 hover:bg-green-800">Product Ideas</a>
						<a href="/projects/blog" class="block px-4 py-2 hover:bg-green-800">Blog</a>
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
			aria-label="Email"
			class=" text-white hover:text-green-300 flex items-center"
		>
			<svelte:component this={Email} />
		</a>
		<a
			href="https://www.linkedin.com/in/nick-brett/"
			aria-label="LinkedIn"
			class=" bg-black text-white hover:text-sky-600 mr-2 flex items-center"
			target="_blank"
			rel="noopener noreferrer"
		>
			<svelte:component this={LinkedIn} />
		</a>
	</nav>
</div>
