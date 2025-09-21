<script>
	const lessonItems = [
		{ id: 'lesson-1', title: 'Planning Upfront Works Well', number: 1 },
		{ id: 'lesson-2', title: 'Automated Checks Are More Valuable', number: 2 },
		{ id: 'lesson-3', title: 'Coding on Just a Phone Is Doable', number: 3 },
		{ id: 'lesson-4', title: 'Environment Iteration Becomes Critical', number: 4 },
		{ id: 'lesson-5', title: 'UI Changes Remained Difficult', number: 5 },
		{ id: 'lesson-6', title: 'There Were Bugs to Work Around', number: 6 },
		{ id: 'lesson-7', title: 'Newer Frameworks Are Challenging', number: 7 },
		{ id: 'lesson-8', title: 'More Software Will Be Written', number: 8 },
		{ id: 'lesson-9', title: 'Quality Can Actually Improve', number: 9 },
		{ id: 'lesson-10', title: 'Surprisingly Fun', number: 10 }
	];

	function scrollToLesson(lessonId) {
		const element = document.getElementById(lessonId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function scrollToCarousel() {
		const element = document.getElementById('lessons-carousel');
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<div class="lessons-quick-nav bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-xl p-6 mb-8">
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<h3 class="text-xl font-bold text-white mb-2">🚀 Skip to the Good Stuff</h3>
			<p class="text-gray-300 text-sm">Jump directly to the 10 key lessons learned from building with AI agents</p>
		</div>
		
		<div class="flex flex-wrap gap-2">
			<button
				class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
				on:click={scrollToCarousel}
			>
				📚 Interactive Overview
			</button>
			<button
				class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
				on:click={() => scrollToLesson('lesson-1')}
			>
				📖 Read Full Lessons
			</button>
		</div>
	</div>

	<div class="mt-4 pt-4 border-t border-blue-700/30">
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
			{#each lessonItems as item}
				<button
					class="group p-3 text-left rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-200"
					on:click={() => scrollToLesson(item.id)}
				>
					<div class="flex items-center gap-2 mb-1">
						<span class="text-blue-400 font-bold text-sm">#{item.number}</span>
						<svg class="w-3 h-3 text-gray-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</div>
					<span class="text-gray-300 group-hover:text-white text-xs font-medium transition-colors">
						{item.title}
					</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="mt-4 text-center">
		<p class="text-gray-400 text-xs">
			💡 Pro tip: Use the interactive carousel below to quickly browse through all lessons with key insights
		</p>
	</div>
</div>