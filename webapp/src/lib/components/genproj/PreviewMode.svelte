<!--
  @fileoverview PreviewMode component for genproj feature
  @description Shows preview of generated files and external service changes
-->

<script>
  import { onMount } from 'svelte';
  import { logger } from '$lib/utils/logging.js';

  // Props
  export let projectName = '';
  export let repositoryUrl = '';
  export let selectedCapabilities = [];
  export let configuration = {};
  export let capabilities = [];

  // State
  let previewData = null;
  let loading = false;
  let error = null;

  // Generate preview data
  async function generatePreview() {
    if (!projectName || selectedCapabilities.length === 0) {
      return;
    }

    try {
      loading = true;
      error = null;

      const response = await fetch('/projects/genproj/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
          repositoryUrl,
          selectedCapabilities,
          configuration,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate preview: ${response.status}`);
      }

      previewData = await response.json();
      logger.success('Preview generated', { 
        projectName, 
        capabilityCount: selectedCapabilities.length 
      });
    } catch (err) {
      error = err.message;
      logger.error('Failed to generate preview', { error: err.message });
    } finally {
      loading = false;
    }
  }

  // Generate preview when dependencies change
  $: if (projectName && selectedCapabilities.length > 0) {
    generatePreview();
  }

  // Get capability name by ID
  function getCapabilityName(capabilityId) {
    const capability = capabilities.find(c => c.id === capabilityId);
    return capability?.name || capabilityId;
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<div class="space-y-6">
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Generating preview...</span>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error generating preview</h3>
          <div class="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {:else if previewData}
    <!-- Project Summary -->
    <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
      <h3 class="text-lg font-medium text-blue-900 mb-2">Project Summary</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <span class="font-medium text-blue-800">Project Name:</span>
          <span class="ml-2 text-blue-700">{projectName}</span>
        </div>
        {#if repositoryUrl}
          <div>
            <span class="font-medium text-blue-800">Repository:</span>
            <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" class="ml-2 text-blue-600 hover:text-blue-800">
              {repositoryUrl}
            </a>
          </div>
        {/if}
        <div>
          <span class="font-medium text-blue-800">Capabilities:</span>
          <span class="ml-2 text-blue-700">{selectedCapabilities.length}</span>
        </div>
        <div>
          <span class="font-medium text-blue-800">Files to Generate:</span>
          <span class="ml-2 text-blue-700">{previewData.files?.length || 0}</span>
        </div>
      </div>
    </div>

    <!-- Generated Files -->
    {#if previewData.files && previewData.files.length > 0}
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Generated Files</h3>
        
        {#each previewData.files as file}
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    {#if file.filePath.endsWith('.json')}
                      <svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                      </svg>
                    {:else if file.filePath.endsWith('.yml') || file.filePath.endsWith('.yaml')}
                      <svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                      </svg>
                    {:else if file.filePath.endsWith('.js') || file.filePath.endsWith('.ts')}
                      <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    {:else if file.filePath.endsWith('.md')}
                      <svg class="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                      </svg>
                    {:else}
                      <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                      </svg>
                    {/if}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{file.filePath}</div>
                    <div class="text-sm text-gray-500">
                      {getCapabilityName(file.capabilityId)} • {formatFileSize(file.content.length)} bytes
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  {#if file.isExecutable}
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Executable
                    </span>
                  {/if}
                  <button
                    class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    on:click={() => {
                      // TODO: Implement file preview modal
                      logger.info('File preview requested', { filePath: file.filePath });
                    }}
                  >
                    Preview
                  </button>
                </div>
              </div>
            </div>
            
            <!-- File Content Preview -->
            <div class="p-4">
              <pre class="text-sm text-gray-700 bg-gray-50 p-3 rounded border overflow-x-auto"><code>{file.content.substring(0, 500)}{file.content.length > 500 ? '...' : ''}</code></pre>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- External Service Changes -->
    {#if previewData.externalServices && previewData.externalServices.length > 0}
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">External Service Changes</h3>
        
        {#each previewData.externalServices as service}
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  {#if service.service === 'github'}
                    <svg class="h-6 w-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  {:else if service.service === 'circleci'}
                    <svg class="h-6 w-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                  {:else if service.service === 'doppler'}
                    <svg class="h-6 w-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                  {:else if service.service === 'sonarcloud'}
                    <svg class="h-6 w-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                  {:else}
                    <svg class="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                    </svg>
                  {/if}
                </div>
                <div>
                  <div class="font-medium text-gray-900">{service.service}</div>
                  <div class="text-sm text-gray-500">{service.action}</div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {service.status}
                </span>
              </div>
            </div>
            
            <div class="text-sm text-gray-700">
              <p>{service.description}</p>
              {#if service.instructions}
                <div class="mt-2 p-3 bg-gray-50 rounded">
                  <p class="font-medium text-gray-800">Instructions:</p>
                  <p class="mt-1">{service.instructions}</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Generation Summary -->
    <div class="bg-green-50 border border-green-200 rounded-md p-4">
      <h3 class="text-lg font-medium text-green-900 mb-2">Ready to Generate</h3>
      <div class="text-sm text-green-700">
        <p>Your project configuration is ready. Click "Generate Project" to create your project with the selected capabilities.</p>
        <div class="mt-3 space-y-1">
          <p><span class="font-medium">Files to create:</span> {previewData.files?.length || 0}</p>
          <p><span class="font-medium">External services:</span> {previewData.externalServices?.length || 0}</p>
          <p><span class="font-medium">Estimated time:</span> 2-5 minutes</p>
        </div>
      </div>
    </div>
  {:else}
    <div class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No preview available</h3>
      <p class="mt-1 text-sm text-gray-500">
        Select capabilities and configure your project to see a preview of what will be generated.
      </p>
    </div>
  {/if}
</div>

<style>
  /* Additional styles if needed */
</style>