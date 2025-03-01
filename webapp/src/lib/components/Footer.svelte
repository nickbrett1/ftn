<script>
	import { GithubBrands, LinkedinInBrands, EnvelopeRegular } from 'svelte-awesome-icons';
</script>

<footer class="left-0 w-full overflow-hidden py-24">
	<div class="relative mx-auto max-w-7xl px-4 md:px-6">
		<p class="mb-2 block text-base font-bold tracking-tight text-green-400">NICK BRETT</p>
		<ul class="flex border-t border-white/20 pt-8 text-sm text-white sm:gap-32">
			<li class="hidden flex-1 sm:block"></li>

			<li class="flex">
				<a
					href="mailto:nick@fintechnick.com"
					class="hover:text-green-300 -mt-1 block h-10 w-10 p-1"
				>
					<EnvelopeRegular /></a
				>
				<a href="https://github.com/nickbrett1/" class=" -mt-1 block h-10 w-10 p-1">
					<GithubBrands />
				</a>

				<a
					href="https://www.linkedin.com/in/nick-brett/"
					class="hover:text-sky-600 -mt-1 block h-10 w-10 p-1"
				>
					<LinkedinInBrands />
				</a>
			</li>
		</ul>
	</div>
</footer>
