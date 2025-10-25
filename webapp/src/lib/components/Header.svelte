<script>
	import { goto } from '$app/navigation';
	import { LinkedinInBrands, EnvelopeRegular, GithubBrands } from 'svelte-awesome-icons';
</script>

<div class="w-full p-2 flex flex-row">
	<button
		onclick={() => {
			goto('/');
		}}
		aria-label="Home"
		class="text-white whitespace-nowrap p-1 text-2xl tracking-wide float-left
			[text-shadow:_0_0_15px_#fff,_0_0_20px_#0fa,_0_0_30px_#0fa,_0_0_40px_#0fa,_0_0_80px_#0fa,_0_0_90px_#0fa,_0_0_100px_#0fa,_0_0_150px_#0fa]"
	>
		Fintech Nick
	</button>

	<nav class="flex flex-row-reverse grow">
		<a
			href="https://www.linkedin.com/in/nick-brett/"
			class="p-1 text-white hover:text-sky-600 flex items-center size-[48px]"
			rel="noopener noreferrer"
		>
			<LinkedinInBrands aria-label="LinkedIn" focusable="true" />
		</a>
		<a href="https://github.com/nickbrett1/ftn" class="p-1 text-white flex items-center size-[48px]">
			<GithubBrands ariaLabel="GitHub" focusable="true" />
		</a>
		<a
			href="mailto:nick@fintechnick.com"
			class="p-1 text-white hover:text-green-400 flex items-center size-[48px]"
		>
			<EnvelopeRegular aria-label="Email" focusable="true" />
		</a>
	</nav>
</div>
