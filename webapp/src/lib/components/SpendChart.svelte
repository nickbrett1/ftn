<script>
    import { onMount, onDestroy } from 'svelte';
    import spendData from '$lib/data/cursor_spend.json';

    let chartContainer;
    let chart;

    onMount(async () => {
        if (typeof window !== 'undefined') {
            const ApexCharts = (await import('apexcharts')).default;

            const options = {
                series: spendData.series,
                chart: {
                    height: 350,
                    type: 'line', // Base type
                    foreColor: '#9ca3af', // Gray text
                    fontFamily: 'inherit',
                    toolbar: {
                        show: false
                    }
                },
                stroke: {
                    width: [0, 4]
                },
                title: {
                    text: 'Cursor Spend Over Time',
                    align: 'left',
                    style: {
                        color: '#fff'
                    }
                },
                dataLabels: {
                    enabled: true,
                    enabledOnSeries: [1]
                },
                labels: spendData.series[0].data.map(d => d[0]),
                xaxis: {
                    type: 'datetime',
                    tooltip: {
                        enabled: false
                    }
                },
                yaxis: [
                    {
                        title: {
                            text: 'Daily Spend ($)',
                            style: {
                                color: '#fff'
                            }
                        },
                        labels: {
                            formatter: (val) => {
                                return "$" + val.toFixed(2);
                            }
                        }
                    },
                    {
                        opposite: true,
                        title: {
                            text: 'Cumulative Spend ($)',
                            style: {
                                color: '#fff'
                            }
                        }
                    }
                ],
                annotations: spendData.annotations,
                tooltip: {
                    theme: 'dark',
                    x: {
                        format: 'dd MMM yyyy'
                    }
                },
                grid: {
                    borderColor: '#374151'
                }
            };

            chart = new ApexCharts(chartContainer, options);
            chart.render();
        }
    });

    onDestroy(() => {
        if (chart) {
            chart.destroy();
        }
    });
</script>

<div class="w-full bg-base-800 rounded-lg p-4 shadow-lg my-8" bind:this={chartContainer}></div>
