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

	it('should emit the auth-off mcphub-dev dev-group extension instead of per-capability circleci stdio', async () => {
		// Migration (goose-mcp-groups-migration §3/§5): the circleci capability no
		// longer wires a per-capability stdio goose block — circleci arrives via
		// the MCPHub `dev` group. Only the single auth-off `mcphub-dev`
		// streamable_http extension is emitted, with no ${VAR}/$VAR anywhere.
		const context = {
			name: 'test-project',
			capabilities: ['circleci', 'doppler', 'devcontainer-node'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const postCreateSetup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(postCreateSetup).toBeDefined();

		expect(postCreateSetup.content).toContain('mcphub-dev:');
		expect(postCreateSetup.content).toContain('uri: http://nas:8781/mcp/dev');
		expect(postCreateSetup.content).not.toContain('ensure_goose_extension');
		expect(postCreateSetup.content).not.toContain(
			'args: ["run", "--", "npx", "-y", "@circleci/mcp-server-circleci"]'
		);
		expect(postCreateSetup.content).not.toContain('${CIRCLECI_TOKEN}');
		expect(postCreateSetup.content).not.toContain('$CIRCLECI_TOKEN');
		expect(postCreateSetup.content).not.toContain('CIRCLECI_TOKEN:');
	});

	it('should write an extensions-only goose config.yaml and NOT bind-mount the host goose config', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['coding-agents', 'devcontainer-node'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const postCreateSetup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(postCreateSetup).toBeDefined();
		// Migration (goose-mcp-groups-migration §2/§4): with no host ~/.config/goose
		// bind-mount, genproj now WRITES an extensions-only config.yaml when none
		// exists (mcphub-dev default toolset). No provider block is emitted.
		expect(postCreateSetup.content).toContain('GOOSECFGEOF');
		expect(postCreateSetup.content).toContain('mcphub-dev:');
		expect(postCreateSetup.content).toContain('uri: http://nas:8781/mcp/dev');
		expect(postCreateSetup.content).not.toContain('provider:');

		// The host goose config must no longer be bind-mounted into the container.
		const devcontainerJson = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
		expect(devcontainerJson).toBeDefined();
		const parsed = JSON.parse(devcontainerJson.content);
		expect(parsed.mounts).not.toContain(
			'source=${localEnv:HOME}/.config/goose,target=/home/node/.config/goose,type=bind'
		);
		// Sanity: doppler/ssh mounts still present, goose recipe bootstrap intact.
		expect(parsed.mounts.some((m) => m.includes('/.ssh,'))).toBe(true);
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
