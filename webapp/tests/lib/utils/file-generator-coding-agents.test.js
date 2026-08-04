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
		const mcpStreamableProxy = files.find(
			(f) => f.filePath === '.agents/mcp-streamable-http-proxy.cjs'
		);

		expect(mcpConfig).toBeDefined();
		expect(mcpProxy).toBeDefined();
		expect(mcpStreamableProxy).toBeDefined();

		const configJson = JSON.parse(mcpConfig.content);
		expect(configJson.mcpServers['memos']).toEqual({
			serverUrl: 'http://nas:5230/mcp'
		});
		expect(configJson.mcpServers['vikunja']).toEqual({
			serverUrl: 'http://nas:8086/'
		});
		// xcode-native should NOT be present when xcode-development capability is not selected
		expect(configJson.mcpServers['xcode-native']).toBeUndefined();

		expect(mcpProxy.content).toContain('connectSSE');
		expect(mcpProxy.content).toContain('sendPost');
		expect(mcpStreamableProxy.content).toContain('Content-Type');
	});

	it('should include memos and vikunja MCP in Goose config within post-create-setup.sh when devcontainer and coding-agents capabilities are selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['coding-agents', 'devcontainer-node'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const postCreateSetup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(postCreateSetup).toBeDefined();
		expect(postCreateSetup.content).toContain('http://nas:5230/mcp');
		expect(postCreateSetup.content).toContain('name: memos');
		expect(postCreateSetup.content).toContain('http://nas:8086/');
		expect(postCreateSetup.content).toContain('name: vikunja');
	});

	it('should include xcode-native in mcp_config.json when xcode-development capability is selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['coding-agents', 'xcode-development'],
			configuration: {}
		};

		const files = await generateAllFiles(context);

		const mcpConfig = files.find((f) => f.filePath === '.agents/mcp_config.json');
		expect(mcpConfig).toBeDefined();

		const configJson = JSON.parse(mcpConfig.content);
		expect(configJson.mcpServers['xcode-native']).toBeDefined();
		expect(configJson.mcpServers['xcode-native'].command).toBe('node');
		expect(configJson.mcpServers['xcode-native'].args).toContain('.agents/mcp-sse-proxy.cjs');
	});
});
