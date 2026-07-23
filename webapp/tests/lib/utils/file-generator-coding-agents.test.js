import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

describe('File Generator - Coding Agents', () => {
	it('should generate mcp_config.json and mcp-sse-proxy.cjs when coding-agents capability is selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['coding-agents'],
			configuration: {}
		};

		const files = await generateAllFiles(context);

		const mcpConfig = files.find((f) => f.filePath === '.agents/mcp_config.json');
		const mcpProxy = files.find((f) => f.filePath === '.agents/mcp-sse-proxy.cjs');

		expect(mcpConfig).toBeDefined();
		expect(mcpProxy).toBeDefined();

		const configJson = JSON.parse(mcpConfig.content);
		expect(configJson.mcpServers['xcode-native']).toBeDefined();
		expect(configJson.mcpServers['xcode-native'].command).toBe('node');
		expect(configJson.mcpServers['xcode-native'].args).toContain('.agents/mcp-sse-proxy.cjs');

		expect(mcpProxy.content).toContain('connectSSE');
		expect(mcpProxy.content).toContain('sendPost');
	});
});
