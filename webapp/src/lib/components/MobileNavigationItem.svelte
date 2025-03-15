<script>
	let { current = 'home', active = 'home', hide = () => {} } = $props();

	function scrollIntoView({ target }) {
		const el = document.querySelector(target.getAttribute('href'));
		if (!el) return;
		el.scrollIntoView({
			behavior: 'smooth'
		});
	}

	function once(fn) {
		return function (event) {
			if (fn) fn.call(this, event);
			fn = null;
		};
	}
</script>

<li>
	<a
		href="#{current}"
		class="block py-2 {active == current ? 'text-green-400' : ''}"
		onclick={once((e) => {
			e.preventDefault();
			hide();
			scrollIntoView(e);
		})}
	>
		{current}
	</a>
</li>
