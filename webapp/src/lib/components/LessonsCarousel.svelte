<script>
	import { onMount } from 'svelte';
	import Button from './Button.svelte';

	const lessons = [
		{
			id: 1,
			title: "Planning Upfront Works Well",
			summary: "Clear structure and requirements lead to better AI agent interactions",
			insight: "The clearer your initial requirements and architecture, the more effectively AI agents can contribute to implementation.",
			content: "The most successful AI agent interactions started with clear structure and requirements. I began the ccbilling project with a comprehensive requirements document that outlined the data model, user flows, and technical constraints."
		},
		{
			id: 2,
			title: "Automated Checks Are More Valuable",
			summary: "Quality automation becomes essential with AI-generated code",
			insight: "Automation isn't just about speed - it's about providing AI agents with structured, actionable feedback they can act upon.",
			content: "With AI agents generating significant portions of code, automated quality checks become essential rather than optional. I leveraged SonarCloud for comprehensive code quality analysis."
		},
		{
			id: 3,
			title: "Coding on Just a Phone Is Doable",
			summary: "Cursor's agent mode enables mobile development workflows",
			insight: "The future of development isn't tied to a specific device or location - AI agents enable truly mobile development workflows.",
			content: "One of the most surprising discoveries was Cursor's agent mode webapp, which allows you to operate the AI agent outside of the IDE through a web interface."
		},
		{
			id: 4,
			title: "Environment Iteration Becomes Critical",
			summary: "Safe experimentation requires preview deployments",
			insight: "When AI agents can work autonomously, you need systems that let you observe and iterate on their work safely.",
			content: "Given the ability to code from anywhere, having an environment that supports rapid iteration becomes even more important."
		},
		{
			id: 5,
			title: "UI Changes Remained Difficult",
			summary: "Visual design requires clear component systems",
			insight: "AI agents excel at logic and structure but struggle with subjective visual decisions. Clear design systems and component libraries are essential.",
			content: "Despite AI agents' capabilities, UI changes proved challenging. Describing placement and styling in natural language is inherently imprecise."
		},
		{
			id: 6,
			title: "There Were Bugs to Work Around",
			summary: "AI agents introduce new failure modes requiring workarounds",
			insight: "AI agents introduce new failure modes that require creative workarounds and clear documentation.",
			content: "AI agents aren't perfect, and I encountered several technical issues that required workarounds. For example, my use of zsh with powerlevel10k caused Cursor to hang."
		},
		{
			id: 7,
			title: "Newer Frameworks Are Challenging",
			summary: "Cutting-edge technologies need reference implementations",
			insight: "AI agents work best with established patterns and examples. For cutting-edge technologies, you need to create your own reference implementations.",
			content: "The agent struggled significantly with Svelte 5's runes mode and its approach to UI reactivity. The newer the framework or feature, the less training data the agent has access to."
		},
		{
			id: 8,
			title: "More Software Will Be Written",
			summary: "AI agents lower barriers to software creation",
			insight: "AI agents don't replace programmers - they enable more people to create more software to solve more problems.",
			content: "There's an ongoing debate about what AI agents mean for the programming profession. I'm relatively optimistic: I believe this will make it much easier to create new software."
		},
		{
			id: 9,
			title: "Quality Can Actually Improve",
			summary: "AI agents can raise software quality through best practices",
			insight: "AI agents can raise software quality by implementing best practices and enabling architectural experimentation that would be too time-consuming otherwise.",
			content: "A common concern is that AI-generated code will lower software quality. In my experience, when used well, the opposite can be true."
		},
		{
			id: 10,
			title: "Surprisingly Fun",
			summary: "Working with AI agents can be genuinely enjoyable",
			insight: "AI agents can make development more collaborative and engaging, not less human.",
			content: "Perhaps most unexpectedly, working with AI agents was genuinely enjoyable. The back-and-forth on approaches mimicked the collaborative feeling of working with other developers."
		}
	];

	let currentIndex = 0;
	let isVisible = false;

	$: currentLesson = lessons[currentIndex];

	function nextLesson() {
		currentIndex = (currentIndex + 1) % lessons.length;
	}

	function prevLesson() {
		currentIndex = (currentIndex - 1 + lessons.length) % lessons.length;
	}

	function goToLesson(index) {
		currentIndex = index;
	}

	function scrollToFullContent() {
		const element = document.getElementById(`lesson-${currentLesson.id}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	onMount(() => {
		// Trigger animation after mount
		setTimeout(() => {
			isVisible = true;
		}, 100);
	});
</script>

<div class="lessons-carousel bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-white mb-2">10 Key Lessons Learned</h2>
		<p class="text-gray-300">Interactive overview of insights from building with AI agents</p>
	</div>

	<!-- Lesson Navigation Dots -->
	<div class="flex justify-center mb-6 space-x-2">
		{#each lessons as lesson, index}
			<button
				class="w-3 h-3 rounded-full transition-all duration-200 {currentIndex === index 
					? 'bg-blue-500 scale-125' 
					: 'bg-gray-600 hover:bg-gray-500'}"
				on:click={() => goToLesson(index)}
				aria-label="Go to lesson {lesson.id}"
			></button>
		{/each}
	</div>

	<!-- Current Lesson Display -->
	<div class="lesson-display transition-all duration-500 ease-in-out" class:visible={isVisible}>
		<div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
			<div class="flex items-center justify-between mb-4">
				<span class="text-blue-400 font-semibold text-sm">Lesson {currentLesson.id}</span>
				<span class="text-gray-400 text-sm">{currentIndex + 1} of {lessons.length}</span>
			</div>
			
			<h3 class="text-xl font-bold text-white mb-3">{currentLesson.title}</h3>
			<p class="text-gray-300 mb-4">{currentLesson.summary}</p>
			
			<div class="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-4">
				<p class="text-blue-200 font-medium text-sm">💡 Key Insight:</p>
				<p class="text-blue-100 text-sm mt-1">{currentLesson.insight}</p>
			</div>

			<p class="text-gray-400 text-sm mb-6">{currentLesson.content}</p>

			<div class="flex justify-between items-center">
				<Button 
					variant="secondary" 
					size="sm"
					on:click={scrollToFullContent}
				>
					Read Full Details
				</Button>
				
				<div class="flex space-x-2">
					<button
						class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
						on:click={prevLesson}
						disabled={currentIndex === 0}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<button
						class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
						on:click={nextLesson}
						disabled={currentIndex === lessons.length - 1}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Quick Jump Menu -->
	<div class="mt-6 pt-6 border-t border-gray-700">
		<h4 class="text-lg font-semibold text-white mb-3">Quick Jump to Lessons:</h4>
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
			{#each lessons as lesson, index}
				<button
					class="p-2 text-left rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors text-sm {currentIndex === index ? 'ring-2 ring-blue-500' : ''}"
					on:click={() => goToLesson(index)}
				>
					<span class="text-blue-400 font-medium">#{lesson.id}</span>
					<span class="block text-xs mt-1">{lesson.title}</span>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.lesson-display {
		opacity: 0;
		transform: translateY(20px);
	}

	.lesson-display.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.lesson-display h3 {
		background: linear-gradient(135deg, #ffffff, #e5e7eb);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
</style>