<script>
	import Img from '@zerodevx/svelte-img';
	import ChevronDown from './svg/ChevronDown.svelte';
	import ChevronUp from './svg/ChevronUp.svelte';
	import LinkedIn from './svg/LinkedIn.svelte';
	import galacticunicorn from '$lib/assets/images/galacticunicorn.png?run&width=480';

	let isOpen = false;

</script>

<div class="w-full fixed bg-black/90 p-3 flex flex-row items-center z-20">
	<p class="whitespace-nowrap py-1 pr-3 text-2xl tracking-wide float-left"
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
		">
	Fintech Nick
	</p> 

	<nav class="flex flex-row-reverse grow">
		<div class="text-white px-2 hover:text-green-300 fill-white hover:fill-green-300 flex flex-row">
			<div class="relative inline-block">
				<button class="flex flex-row" on:click={() => (isOpen = !isOpen)}>
					<div class="px-1">
						Projects
					</div>
					<svelte:component this={isOpen ? ChevronUp : ChevronDown } />
				</button>
				{#if isOpen}
				<div class="absolute right-0 top-10 w-64 bg-black text-white rounded ">
					<div class=" hover:bg-green-800">
						<a href="/projects/galactic" class="block px-4 py-2">Galactic Unicorn</a>
						<Img src={galacticunicorn} alt="Galactic Unicorn Hardward Project" class="block w-64 h-64" />
					</div>
					<a href="/projects/makingof" class="block px-4 py-2 hover:bg-green-800">Making Of</a>
					<a href="/projects/chase" class="block px-4 py-2 hover:bg-green-800">Chase Monthly</a>
					<a href="/projects/product" class="block px-4 py-2 hover:bg-green-800">Product Ideas</a>
					<a href="/projects/driftdb" class="block px-4 py-2  hover:bg-green-800">driftdb</a>
					<a href="/projects/blog" class="block px-4 py-2 hover:bg-green-800">Blog</a>
					<a href="/projects/hyatt" class="block px-4 py-2  hover:bg-green-800">Hyatt Suite Checker</a>
					{#await import('./Login.svelte') then Login }
						<Login.default class="block px-4 py-2  hover:bg-green-800 w-full text-left" loggedInText="Configure" loggedOutText="Admin"/>
					{/await}
				</div>
				{/if}
			</div>	
		</div>
		<a href="mailto:nick@fintechnick.com" class="text-white px-2 hover:text-green-300">		
			Contact
		</a>
		<a href="https://www.linkedin.com/in/nick-brett/" 
			aria-label="LinkedIn"
			class="bg-white hover:bg-sky-600" target="_blank" rel="noopener noreferrer">
			<svelte:component this={LinkedIn} />
	</a>
	</nav>
</div>