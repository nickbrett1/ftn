<!--
  @fileoverview Test harness for CapabilitySelector.
  @description A legacy component (so it can consume the selector's
  `createEventDispatcher` events) that forwards the payload the selector pushes
  on a configuration change to a test callback. Svelte 5 removed `$on` from a
  component instance, so this is how a test observes the emitted configuration.
-->
<script>
	import CapabilitySelector from '$lib/components/genproj/CapabilitySelector.svelte';

	export let capabilities = [];
	export let categories = [];
	export let selectedCapabilities = [];
	export let configuration = {};
	export let configurationSchema = null;
	export let onConfigurationChange = null;

	function handleConfigurationChange(event) {
		onConfigurationChange?.(event.detail);
	}
</script>

<CapabilitySelector
	{capabilities}
	{categories}
	{selectedCapabilities}
	{configuration}
	{configurationSchema}
	on:configurationChange={handleConfigurationChange}
/>
