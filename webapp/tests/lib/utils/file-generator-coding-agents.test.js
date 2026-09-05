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

	it('should register the circleci-lite remote goose extension (default) with no env var references', async () => {
		// Generated projects default to the lightweight circleci-lite MCP (a
		// remote streamable_http server, no secrets) instead of the full
		// @circleci/mcp-server-circleci stdio server. The emitted goose YAML
		// must NEVER contain a ${VAR}/$VAR env ref (goose passes verbatim → 401).
		const context = {
			name: 'test-project',
			capabilities: ['circleci', 'doppler', 'devcontainer-node'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const postCreateSetup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(postCreateSetup).toBeDefined();

		// The remote streamable_http block is registered for circleci-lite.
		expect(postCreateSetup.content).toContain('ensure_goose_extension "circleci-lite"');
		expect(postCreateSetup.content).toContain('circleci-lite');
		expect(postCreateSetup.content).toContain('type: streamable_http');
		expect(postCreateSetup.content).toContain('uri: http://100.82.223.13:8092/circleci-lite');
		expect(postCreateSetup.content).not.toContain('@circleci/mcp-server-circleci');
		expect(postCreateSetup.content).not.toContain('cmd: doppler');

		// No env/token references in the emitted goose YAML.
		expect(postCreateSetup.content).not.toContain('${CIRCLECI_TOKEN}');
		expect(postCreateSetup.content).not.toContain('$CIRCLECI_TOKEN');
		expect(postCreateSetup.content).not.toContain('CIRCLECI_TOKEN:');
	});

	it('should not clobber goose config in post-create-setup.sh and should bind-mount the host goose config when devcontainer and coding-agents capabilities are selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['coding-agents', 'devcontainer-node'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const postCreateSetup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(postCreateSetup).toBeDefined();
		// Regression: genproj used to `cat > $HOME/.config/goose/config.yaml` with
		// a hardcoded provider-less config, breaking goose in generated projects
		// ("No provider configured. Run 'goose configure' first."). The setup
		// script must never write or overwrite the user's goose config.
		expect(postCreateSetup.content).not.toContain('cat > "$HOME/.config/goose/config.yaml"');
		expect(postCreateSetup.content).not.toContain('GOOSECFGEOF');
		expect(postCreateSetup.content).toContain('if [ -f "$HOME/.config/goose/config.yaml" ]');

		// The user's real config (provider + extensions) comes from the host via
		// a devcontainer bind mount (still valid JSON after template expansion).
		const devcontainerJson = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
		expect(devcontainerJson).toBeDefined();
		const parsed = JSON.parse(devcontainerJson.content);
		expect(parsed.mounts).toContain(
			'source=${localEnv:HOME}/.config/goose,target=/home/node/.config/goose,type=bind'
		);
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
