<!-- Inspired by https://mario.tiscareno.dev/ -->

<script>
	let {
		heading = '',
		subheading = '',
		body = [],
		keywords = [],
		icons = [],
		from = '',
		to = ''
	} = $props();
</script>

<div
	class="
		milestone
		relative
		mx-auto
		flex
		items-start
		justify-center
		sm:pl-8
		sm:before:absolute
		sm:before:inset-0
		sm:before:-left-72
		sm:before:h-[1px]
		sm:before:w-1/2
		sm:before:bg-gradient-to-r
		sm:before:from-white/25
		sm:before:to-transparent"
>
	<!-- Date -->
	<time
		class="
			hidden
			h-15
			w-48
			shrink-0
			items-center
			justify-center
			rounded-bl
			border
		border-b-black/10
		border-l-white/10
		border-r-black/10
		border-t-white/10
		bg-white/10 p-2
		text-white
			tracking-normal
			font-medium
			sm:flex"
	>
		{from} - {to}
	</time>

	<!-- Card -->
	<div
		class="
			w-full
			rounded-lg
			rounded-b-lg
			rounded-r-lg
			backdrop-blur-sm
			border
			border-b-black/10
			border-l-white/10
			border-r-black/10
			border-t-white/10
			bg-white/5
			sm:rounded-tl-none
			sm:p-6"
	>
		<div>
			<h3 class="flex sm:hidden text-white pb-2">{from} - {to}</h3>
			<h2 class="text-xl font-bold tracking-tight text-white sm:text-2xl">{heading}</h2>
			<h3 class="tracking-tight text-green-400/80 lg:text-lg">
				{subheading}
			</h3>
		</div>
		<div class="mt-6 flex flex-col gap-4 text-pretty text-xs text-white sm:text-sm">
			{#each body as paragraph}
				<p class="leading-normal tracking-normal">{paragraph}</p>
			{/each}
			{#if keywords.length > 0}
				<div class="my-6">
					<ul class="flex flex-wrap gap-1 text-[0.7rem] leading-snug tracking-wide text-white/75">
						{#each keywords as keyword}
							<li class="rounded-full bg-white/10 px-2 py-0.5">{keyword}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
		<div class="flex flex-wrap gap-3.5">
			{#each icons as icon}
				<icon></icon>
			{/each}
		</div>
	</div>
</div>
