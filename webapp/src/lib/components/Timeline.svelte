<script>
	import {
		Timeline,
		TimelineItem,
		TimelineSeparator,
		TimelineDot,
		TimelineConnector,
		TimelineContent,
		TimelineOppositeContent
	} from 'svelte-vertical-timeline';

	const options = [
		{ title: 'Eat', time: '09:30 am' },
		{ title: 'Sleep', time: '10:00 am' },
		{ title: 'Code', time: '11:00 am' },
		{ title: 'Eat', time: '01:00 pm' }
	];
</script>

<div class="py-40">
	<Timeline
		position="alternate"
		style={'border: solid 1px #dbdbdb; padding: 50px 0; border-radius: 2%;'}
	>
		{#each options as option}
			<TimelineItem>
				<TimelineOppositeContent slot="opposite-content">
					<p>{option.time}</p>
				</TimelineOppositeContent>
				<TimelineSeparator>
					<TimelineDot style={'background-color: #7CD5E2;'} />
					<TimelineConnector />
				</TimelineSeparator>
				<TimelineContent>
					<h3>{option.title}</h3>
				</TimelineContent>
			</TimelineItem>
		{/each}
	</Timeline>
</div>

<style>
	h3 {
		letter-spacing: 1.5px;
		margin: 0;
		padding: 0;
	}

	p {
		letter-spacing: 1.5px;
		margin: 0;
		color: grey;
	}
</style>
