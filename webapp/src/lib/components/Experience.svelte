<script>
	import Milestone from '$lib/components/Milestone.svelte';

	const work = [];
</script>

<div>
	<div class="mb-20 text-xl leading-none text-green-400">&rarr; EXPERIENCE</div>

	<p
		class="mb-24 text-pretty pr-24 text-2xl leading-tight tracking-tight text-white md:text-3xl lg:w-1/2"
	>
		Where I've worked, what I've built, and the impact I've had.
	</p>
	<div
		class="relative mx-auto space-y-12 overflow-hidden via-90% pb-4 sm:pt-8 sm:before:absolute sm:before:inset-0 sm:before:left-[1px] sm:before:h-full sm:before:w-[1px] sm:before:-translate-x-px sm:before:bg-gradient-to-b sm:before:from-white/25 sm:before:via-white/25 sm:before:to-transparent"
	>
		{#each work as w, i}
			<Milestone
				from={w.from}
				to={w.to}
				heading={w.title}
				subheading={w.workPlace}
				body={w.body}
				keywords={w.keywords}
				icons={w.icons}
				active={i === 0}
			></Milestone>
		{/each}
	</div>
</div>
