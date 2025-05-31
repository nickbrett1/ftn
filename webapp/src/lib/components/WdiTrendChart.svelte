<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	export let seriesData = [];
	export let chartTitle = 'WDI Data Trend';

	let chartElement;
	let chart;

	const chartOptions = {
		chart: {
			type: 'line',
			height: 450,
			zoom: { enabled: true },
			toolbar: {
				show: true,
				tools: {
					download: true,
					selection: true,
					zoom: true,
					zoomin: true,
					zoomout: true,
					pan: true,
					reset: true
				}
			},
			foreColor: '#e5e7eb' // Tailwind gray-200 for text
		},
		xaxis: {
			type: 'numeric', // Years are numeric
			title: { text: 'Year', style: { color: '#9ca3af' } }, // Tailwind gray-400
			labels: { style: { colors: '#9ca3af' } },
			axisBorder: { color: '#4b5563' }, // Tailwind gray-600
			axisTicks: { color: '#4b5563' }
		},
		yaxis: {
			title: { text: 'Value', style: { color: '#9ca3af' } },
			labels: {
				formatter: function (value) {
					if (value === null || value === undefined) return '';
					if (typeof value !== 'number' || isNaN(value)) return String(value);
					if (Math.abs(value) >= 1e12) return (value / 1e12).toFixed(1) + 'T';
					if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(1) + 'B';
					if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(1) + 'M';
					if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(1) + 'K';
					return value.toFixed(2);
				},
				style: { colors: '#9ca3af' }
			},
			axisBorder: { color: '#4b5563' },
			axisTicks: { color: '#4b5563' }
		},
		tooltip: {
			x: { formatter: (val) => 'Year: ' + val },
			theme: 'dark'
		},
		stroke: { curve: 'smooth', width: 2.5 },
		markers: { size: 4, hover: { size: 6 } },
		grid: {
			borderColor: '#4b5563', // Tailwind gray-600
			row: { colors: ['transparent', 'rgba(75, 85, 99, 0.1)'], opacity: 0.5 } // transparent and gray-600 with opacity
		},
		legend: {
			labels: { colors: '#e5e7eb' },
			position: 'top',
			horizontalAlign: 'right',
			floating: true,
			offsetY: -25,
			offsetX: -5
		},
		noData: {
			text: 'Please select a country and indicators to see data.',
			align: 'center',
			verticalAlign: 'middle',
			style: { color: '#9ca3af', fontSize: '14px' }
		}
	};

	onMount(async () => {
		if (browser) {
			const ApexCharts = (await import('apexcharts')).default;
			chart = new ApexCharts(chartElement, {
				...chartOptions,
				series: seriesData && seriesData.length > 0 ? seriesData : [],
				title: { text: chartTitle, align: 'left', style: { color: '#34d399' } } // Tailwind green-400
			});
			chart.render();
		}
	});

	// Reactive updates for props
	// Ensure chart exists before trying to update (it might not if SSR or onMount hasn't run)
	$: if (chart) {
		chart.updateOptions(
			{
				title: { text: chartTitle, align: 'left', style: { color: '#34d399' } }
			},
			false,
			false
		); // No redraw, no animate
	}
	$: if (chart) {
		chart.updateSeries(seriesData && seriesData.length > 0 ? seriesData : [], true); // Animate series update
	}

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});
</script>

<div bind:this={chartElement} class="w-full min-h-[450px] bg-gray-800 p-2 rounded-lg">
	<!-- Chart will be rendered here by ApexCharts -->
</div>
