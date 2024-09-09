<script>
	import {
		Timeline,
		TimelineItem,
		TimelineSeparator,
		TimelineDot,
		TimelineConnector,
		TimelineContent
	} from 'svelte-vertical-timeline';

	const options = [{ title: 'Eat' }, { title: 'Sleep' }, { title: 'Code' }];
</script>

<Timeline>
	<!-- 
		{#each options as option}
		<TimelineItem>
			<TimelineSeparator>
				<TimelineDot style="background-color: white" />
				<TimelineConnector />
			</TimelineSeparator>
			<TimelineContent>
				<h3
					class="text-white sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-10xl font-white"
				>
					{option.title}
				</h3>
			</TimelineContent>
		</TimelineItem>
	{/each}
-->
</Timeline>
