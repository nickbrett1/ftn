<!-- Inspired by https://mario.tiscareno.dev/ -->

<script>
	import MilestoneLogo from '$lib/components/MilestoneLogo.svelte';

	let id = $props.id();

	let {
		heading = '',
		subheading = '',
		body = [],
		keywords = [],
		skillIcons = [],
		from = '',
		to = '',
		logo = null
	} = $props();
</script>

<div
	scroll-btween={'milestone' + id}
	data-filter="blur(|0:2 to 30:0 to 70:0 to 100:2|px) contrast(|0:0.1 to 30:1 to 70:1 to 100:0.1|)"
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
	<span
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
	</span>

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
			<h3 class="sm:hidden text-white pb-2">
				{from} - {to}
			</h3>
			<div class="flex grow">
				<div class="grow">
					<h2 class="text-xl font-bold tracking-tight text-white sm:text-2xl">{heading}</h2>
					<h3 class="tracking-tight text-green-400/80 lg:text-lg">
						{subheading}
					</h3>
				</div>
				{#if logo}
					<div class="max-h-22 max-w-22 min-h-20 min-w-20 grow">
						<MilestoneLogo data={logo} />
					</div>
				{/if}
			</div>
		</div>
		<div class="mt-6 flex flex-col gap-4 text-pretty text-xs text-white sm:text-sm">
			{#each body as paragraph (paragraph)}
				<p class="leading-normal tracking-normal">{paragraph}</p>
			{/each}
			{#if keywords.length > 0}
				<div class="my-6">
					<ul class="flex flex-wrap gap-1 text-[0.7rem] leading-snug tracking-wide text-white/75">
						{#each keywords as keyword (keyword)}
							<li class="rounded-full bg-white/10 px-2 py-0.5">{keyword}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
		<div class="flex flex-wrap gap-3.5">
			{#each skillIcons as SkillIcon (SkillIcon)}
				<SkillIcon />
			{/each}
		</div>
	</div>
</div>
