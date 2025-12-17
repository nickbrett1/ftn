<script>
  import { onMount } from 'svelte';
  import tippy from 'tippy.js';
  import 'tippy.js/dist/tippy.css';

  onMount(() => {
    tippy('[data-tippy-content]', {
      theme: 'light-border',
      arrow: false,
    });
  });
</script>

<div class="diagram-container">
  <svg width="1000" height="800" viewBox="0 0 1000 800">
    <!-- Arrows -->
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.871 0.15 154.449)" />
      </marker>
    </defs>

    <!-- Data Governance -->
    <rect x="10" y="50" width="40" height="700" rx="10" class="governance-box" data-tippy-content="Data Governance: A centralized framework to ensure data is managed consistently and meets organizational standards for quality, security, and compliance." />
    <text x="30" y="400" class="governance-text">Data Governance</text>

    <!-- Sources -->
    <g id="sources" data-tippy-content="Sources: The origin points of data, which can be either streaming (real-time) or batch (collected over time).">
      <text x="400" y="30" class="section-title">Sources</text>
      <path d="M 350 50 L 400 80 L 350 110 L 300 80 Z" class="diamond" data-tippy-content="Streaming: Real-time data from sources like IoT devices, applications, and social media."/>
      <text x="335" y="85">Streaming</text>
      <path d="M 450 50 L 500 80 L 450 110 L 400 80 Z" class="diamond" data-tippy-content="Batch: Data collected and processed in bulk at regular intervals."/>
      <text x="440" y="85">Batch</text>
    </g>

    <!-- Collect and Transform -->
    <g id="collect-transform" data-tippy-content="Collect and Transform: The process of gathering data from sources and converting it into a usable format.">
      <text x="650" y="30" class="section-title">Collect and Transform</text>
      <rect x="250" y="130" width="300" height="50" rx="10" class="component-box" data-tippy-content="CDC, ETL, Event Streaming: Methods for collecting and transforming data."/>
      <text x="325" y="160">CDC | ETL | Event Streaming</text>
    </g>

    <!-- Store -->
    <g id="store" data-tippy-content="Store: The phase where data is stored in various systems like data lakes or data warehouses.">
        <text x="650" y="200" class="section-title">Store</text>
        <!-- Data Lake -->
        <rect x="150" y="200" width="400" height="150" rx="10" class="container-box" data-tippy-content="Data Lake: A central repository for storing large amounts of raw data in its native format."/>
        <text x="520" y="280" class="container-text">Data Lake</text>
        <rect x="270" y="220" width="200" height="30" rx="5" class="component-box" data-tippy-content="Raw/landing/bronze: The first stage in the data lake, holding raw data in its original format." />
        <text x="300" y="240">Raw/landing/bronze</text>
        <rect x="270" y="260" width="200" height="30" rx="5" class="component-box" data-tippy-content="Staging/dev/silver: Intermediate storage where data is cleaned, transformed, and enriched." />
        <text x="310" y="280">Staging/dev/silver</text>
        <rect x="270" y="300" width="200" height="30" rx="5" class="component-box" data-tippy-content="Production/gold: The final, curated layer of the data lake, providing high-quality, analysis-ready data." />
        <text x="310" y="320">Production/gold</text>
        <rect x="170" y="240" width="80" height="90" rx="5" class="component-box" data-tippy-content="Sensitive Stage: A secure area for handling sensitive data, using technologies like Iceberg, Hudi, Delta Lake, or HDFS." />
        <text x="180" y="285">Sensitive</text>

        <!-- DWH -->
        <rect x="150" y="370" width="500" height="200" rx="10" class="container-box" data-tippy-content="Data Warehouse (DWH): A system used for reporting and data analysis, storing structured and processed data."/>
        <text x="620" y="470" class="container-text">DWH</text>
        <g id="dwh-storage" data-tippy-content="Storage: Physical storage for the DWH, organized into Raw, Enriched, and Curated layers.">
          <rect x="240" y="430" width="70" height="80" rx="5" class="component-box" /> <text x="260" y="475">Raw</text>
          <rect x="320" y="430" width="70" height="80" rx="5" class="component-box" /> <text x="330" y="475">Enriched</text>
          <rect x="400" y="430" width="70" height="80" rx="5" class="component-box" /> <text x="415" y="475">Curated</text>
        </g>
        <g id="analytical-engine" data-tippy-content="Analytical Engine: Powers querying and analysis (SQL, AI/ML, Streaming).">
            <rect x="480" y="390" width="120" height="100" rx="5" class="component-box"/>
            <text x="490" y="410">Analytical Engine</text>
            <rect x="490" y="425" width="100" height="20" rx="5" class="inner-box"/> <text x="525" y="440">SQL</text>
            <rect x="490" y="450" width="100" height="20" rx="5" class="inner-box"/> <text x="520" y="465">AI/ML</text>
            <rect x="490" y="475" width="100" height="20" rx="5" class="inner-box"/> <text x="510" y="490">Streaming</text>
        </g>
        <rect x="480" y="500" width="120" height="50" rx="5" class="component-box" data-tippy-content="Programming Language Module: Allows for custom data processing and analysis."/>
        <text x="490" y="530">Programming</text>
    </g>

    <!-- Analyze, Visualize, Activate -->
    <g id="analyze-visualize-activate" data-tippy-content="Analyze, Visualize, and Activate: Tools and applications for end-users to interact with the data.">
      <text x="800" y="500" class="section-title">Analyze, Visualize, and Activate</text>
      <rect x="200" y="600" width="100" height="50" rx="10" class="component-box" data-tippy-content="Applications: Custom applications that use the data."/>
      <text x="210" y="630">Applications</text>
      <rect x="310" y="600" width="100" height="50" rx="10" class="component-box" data-tippy-content="BI/Reporting: Business intelligence and reporting tools."/>
      <text x="320" y="630">BI/Reporting</text>
      <rect x="420" y="600" width="100" height="50" rx="10" class="component-box" data-tippy-content="SQL Clients: Tools for writing and executing SQL queries."/>
      <text x="440" y="630">SQL Clients</text>
      <rect x="530" y="600" width="100" height="50" rx="10" class="component-box" data-tippy-content="Notebooks: Interactive environments for data exploration and analysis."/>
      <text x="550" y="630">Notebooks</text>
    </g>

     <!-- End Users -->
    <g id="end-users" data-tippy-content="End Users: The consumers of the data, including business users, data analysts, and data scientists.">
      <text x="800" y="650" class="section-title">End Users</text>
      <rect x="650" y="680" width="100" height="50" rx="10" class="component-box" data-tippy-content="Business Users"/>
      <text x="660" y="710">Business Users</text>
      <rect x="760" y="680" width="100" height="50" rx="10" class="component-box" data-tippy-content="Data Analysts"/>
      <text x="775" y="710">Data Analysts</text>
      <rect x="870" y="680" width="100" height="50" rx="10" class="component-box" data-tippy-content="Data Scientists"/>
      <text x="880" y="710">Data Scientists</text>
    </g>
    
    <!-- ETL/ELT Labels -->
    <rect x="170" y="385" width="40" height="30" rx="5" class="etl-box" /><text x="180" y="405" class="etl-text">ETL</text>
    <rect x="290" y="520" width="40" height="30" rx="5" class="etl-box" /><text x="300" y="540" class="etl-text">ELT</text>
    <rect x="370" y="520" width="40" height="30" rx="5" class="etl-box" /><text x="380" y="540" class="etl-text">ELT</text>

    <!-- Arrows -->
    <path d="M 350 110 V 130" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 450 110 V 130" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 400 180 V 220" class="flow-arrow flow-animation" marker-end="url(#arrow)" />

    <path d="M 370 250 V 260" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 370 290 V 300" class="flow-arrow flow-animation" marker-end="url(#arrow)" />

    <path d="M 370 330 V 370" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 190 415 H 240" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    
    <path d="M 325 570 V 600" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 500 570 V 600" class="flow-arrow flow-animation" marker-end="url(#arrow)" />

    <path d="M 250 650 V 680 H 650" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 360 650 V 705 H 760" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 470 650 V 680 H 850" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 580 650 V 705 H 870" class="flow-arrow flow-animation" marker-end="url(#arrow)" />

    <path d="M 275 430 H 290 V 520" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
    <path d="M 355 430 H 370 V 520" class="flow-arrow flow-animation" marker-end="url(#arrow)" />
  </svg>
</div>

<style>
  .diagram-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    min-height: 850px;
    background-color: #18181b; /* zinc-900 */
    border-radius: 8px;
    padding: 2rem;
  }

  .section-title {
    font-size: 14px;
    font-weight: bold;
    fill: #fef3c7;
    text-transform: uppercase;
  }

  .governance-text, .container-text {
    font-size: 14px;
    font-weight: bold;
    fill: #fef3c7;
    writing-mode: tb;
    text-anchor: middle;
    text-transform: uppercase;
  }

  .component-box, .container-box, .governance-box, .diamond, .etl-box, .inner-box {
    fill: #27272a; /* zinc-800 */
    stroke: oklch(0.871 0.15 154.449);
    stroke-width: 1;
    transition: fill 0.3s ease;
  }

  .component-box:hover, .container-box:hover, .governance-box:hover, .diamond:hover, .etl-box:hover, .inner-box:hover {
    fill: #3f3f46; /* zinc-700 */
  }

  text {
    fill: #e4e4e7; /* zinc-200 */
    font-size: 12px;
    font-family: monospace;
    pointer-events: none;
    user-select: none;
  }

  .etl-text {
      font-size: 10px;
  }

  .flow-arrow {
      stroke: oklch(0.871 0.15 154.449);
      stroke-width: 1.5;
      fill: none;
  }

  .flow-animation {
    stroke-dasharray: 5;
    animation: dash 0.5s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: -10;
    }
  }
</style>
