<script>
	import DataArchitectureHTML from './DataArchitectureHTML.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Img from '@zerodevx/svelte-img';
	import originalSketch from '$lib/images/original-architecture-sketch.jpeg?as=run';
</script>

<svelte:head>
	<title>Gemini 3 Data Architecture Diagram</title>
</svelte:head>

<div class="min-h-screen bg-zinc-900 flex flex-col">
	<Header />
	<main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
		<!-- New Header Section -->
		<h1 class="text-3xl font-bold text-white text-center my-8">
			Gemini 3: From Photo to Interactive Diagram
		</h1>
		<div class="max-w-4xl mx-auto mb-12 text-center text-gray-300 space-y-6">
			<p class="text-lg">
				Most use-cases I've seen for coding agents focus on taking a text prompt and generating
				text.
			</p>

			<!-- Typical Workflow Diagram -->
			<div class="flex flex-col md:flex-row items-center justify-center gap-4 my-6 text-white">
				<div class="flex flex-col items-center gap-2">
					<div class="bg-zinc-800 border border-zinc-600 p-4 rounded-lg text-center w-32 shadow-lg">
						<span class="text-2xl mb-2 block">📝</span>
						<span class="text-sm font-medium text-gray-200">Text Prompt</span>
					</div>
				</div>

				<div class="text-2xl font-bold text-gray-500 hidden md:block">→</div>
				<div class="md:hidden text-gray-500">↓</div>

				<div class="flex flex-col items-center justify-center">
					<div
						class="bg-gradient-to-br from-blue-600 to-purple-600 p-1 rounded-full shadow-lg shadow-purple-500/20"
					>
						<div
							class="bg-zinc-900 rounded-full w-24 h-24 flex flex-col items-center justify-center"
						>
							<span class="text-2xl mb-1">✨</span>
							<span
								class="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400"
								>Gemini 3</span
							>
						</div>
					</div>
				</div>

				<div class="text-2xl font-bold text-gray-500 hidden md:block">→</div>
				<div class="md:hidden text-gray-500">↓</div>

				<div class="flex flex-col items-center gap-2">
					<div class="bg-zinc-800 border border-zinc-600 p-4 rounded-lg text-center w-32 shadow-lg">
						<span class="text-2xl mb-2 block">💻</span>
						<span class="text-sm font-medium text-gray-200">Code</span>
					</div>
				</div>
			</div>

			<p class="text-lg">
				However, newer models like Gemini 3 claim to have strong <strong
					><a
						href="https://cloud.google.com/use-cases/multimodal-ai"
						class="text-emerald-400 hover:text-emerald-300 underline"
						target="_blank"
						rel="noopener noreferrer">multi-modal capabilities</a
					></strong
				>.
			</p>

			<!-- Visual Workflow Diagram -->
			<div class="flex flex-col md:flex-row items-center justify-center gap-4 my-10 text-white">
				<!-- Inputs Group -->
				<div
					class="flex flex-col sm:flex-row items-center gap-4 bg-zinc-800/30 p-4 rounded-xl border border-dashed border-zinc-700"
				>
					<div class="flex flex-col items-center gap-2">
						<div
							class="bg-zinc-800 border border-zinc-600 p-4 rounded-lg text-center w-32 shadow-lg"
						>
							<span class="text-2xl mb-2 block">📝</span>
							<span class="text-sm font-medium text-gray-200">Text Prompt</span>
						</div>
					</div>

					<div class="text-2xl font-bold text-gray-500">+</div>

					<div class="flex flex-col items-center gap-2">
						<div
							class="bg-zinc-800 border border-zinc-600 p-4 rounded-lg text-center w-32 shadow-lg"
						>
							<span class="text-2xl mb-2 block">🖼️</span>
							<span class="text-sm font-medium text-gray-200">Image</span>
						</div>
					</div>
				</div>

				<div class="text-2xl font-bold text-gray-500 hidden md:block">→</div>
				<div class="md:hidden text-gray-500">↓</div>

				<div class="flex flex-col items-center justify-center">
					<div
						class="bg-gradient-to-br from-blue-600 to-purple-600 p-1 rounded-full shadow-lg shadow-purple-500/20"
					>
						<div
							class="bg-zinc-900 rounded-full w-24 h-24 flex flex-col items-center justify-center"
						>
							<span class="text-2xl mb-1">✨</span>
							<span
								class="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400"
								>Gemini 3</span
							>
						</div>
					</div>
				</div>

				<div class="text-2xl font-bold text-gray-500 hidden md:block">→</div>
				<div class="md:hidden text-gray-500">↓</div>

				<div class="flex flex-col items-center gap-2">
					<div class="bg-zinc-800 border border-zinc-600 p-4 rounded-lg text-center w-32 shadow-lg">
						<span class="text-2xl mb-2 block">💻</span>
						<span class="text-sm font-medium text-gray-200">Code</span>
					</div>
				</div>
			</div>

			<p>
				As an experiment, I uploaded a photo of a data architecture diagram from the excellent book
				<a
					href="https://www.oreilly.com/library/view/architecting-data-and/9781098151607/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-emerald-400 hover:text-emerald-300 underline"
					><em>Architecting Data and Machine Learning Platforms</em></a
				>.
			</p>
			<p>
				My goal was to build on the concepts and explain them to others, so I asked Gemini to
				generate a fully functional, interactive HTML/Svelte diagram based on the image.
			</p>
			<p>
				The result below was quite good and highlights how Gemini 3 can interpret visual spatial
				relationships and text, translating them into semantic structure and styled components. It
				took some iteration to produce the results; it wasn't a one-shot prompt, but still
				impressive.
			</p>
		</div>

		<!-- Comparison Section -->
		<div class="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
			<!-- Original Image -->
			<div class="flex flex-col gap-4">
				<div class="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700 shadow-xl">
					<h2 class="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z"
							></path></svg
						>
						The Input: Original Image
					</h2>
					<div class="relative rounded-lg overflow-hidden border border-zinc-600 bg-black">
						<Img
							src={originalSketch}
							alt="Original data architecture diagram from book"
							class="w-full h-auto object-contain max-h-[800px]"
						/>
					</div>
					<p class="text-sm text-gray-400 mt-4 italic">
						A photo of a diagram from the book <em
							>Architecting Data and Machine Learning Platform</em
						> provided as the reference material.
					</p>
				</div>
			</div>

			<!-- Generated Diagram -->
			<div class="flex flex-col gap-4">
				<div class="bg-zinc-800/50 rounded-xl p-1 border border-zinc-700 shadow-xl overflow-hidden">
					<div class="p-5 pb-0">
						<h2 class="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								></path></svg
							>
							The Output: Generated Code
						</h2>
						<p class="text-sm text-gray-400 mb-4 italic">
							Interactive Svelte component generated by Gemini 3. Click items to explore. Boxes with
							purple stars contain links to my projects.
						</p>
					</div>
					<!-- Wrapper to ensure diagram containment -->
					<div class="diagram-container w-full overflow-x-auto pb-4 px-2">
						<div class="min-w-[350px]">
							<DataArchitectureHTML />
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
	<Footer />
</div>

<style>
	/* Global style to target the picture element generated by Svelte-Img */
	:global(picture img) {
		max-width: 100%;
		height: auto;
	}
</style>
