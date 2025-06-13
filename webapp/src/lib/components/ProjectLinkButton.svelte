<script>
	import { GithubBrands } from 'svelte-awesome-icons';
	export let href = '';
	export let text = 'Check out the code';
</script>

<a
	{href}
	class="not-prose my-4 flex items-center justify-center w-full sm:w-auto sm:max-w-xs bg-gray-700 hover:bg-gray-600 border border-green-800 text-white font-semibold py-2 px-4 rounded transition-colors space-x-2 no-underline"
>
	<GithubBrands class="w-5 h-5" />
	<span>{text}</span>
</a>
