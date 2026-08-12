import { describe, it, expect } from 'vitest';
import { TemplateEngine, generateMergedDevelopmentContainerFiles } from '$lib/utils/file-generator';

describe('DevContainer Generation Tests', () => {
	it('should generate valid Java devcontainer.json without undefined variables', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			capabilities: ['devcontainer-java'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-java']);

		const devcontainerJsonFile = files.find(
			(f) => f.filePath === '.devcontainer/devcontainer.json'
		);
		expect(devcontainerJsonFile).toBeDefined();

		const devcontainerJson = JSON.parse(devcontainerJsonFile.content);

		// Check for unresolved variables in build
		expect(devcontainerJson.build).toEqual({ dockerfile: 'Dockerfile' });

		// Check for runArgs
		expect(devcontainerJson.runArgs).toContain('--sysctl');
		expect(devcontainerJson.runArgs).toContain('net.ipv6.conf.all.disable_ipv6=1');

		// Check that the workspace folder is set so terminals start in the project dir
		expect(devcontainerJson.workspaceFolder).toBe('/workspaces/my-project');

		// Check for unresolved variables in features
		const javaFeature = devcontainerJson.features['ghcr.io/devcontainers/features/java:1'];
		expect(javaFeature).toBeDefined();
		expect(javaFeature.version).toBe('21');

		// Check for correct user in features
		expect(
			devcontainerJson.features['ghcr.io/devcontainers/features/common-utils:2'].username
		).toBe('vscode');

		// Check Dockerfile user
		const dockerfileFile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
		expect(dockerfileFile).toBeDefined();
		expect(dockerfileFile.content).toContain('USER vscode');
	});

	it('should generate valid Python devcontainer.json without undefined variables', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			capabilities: ['devcontainer-python'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-python']);

		const devcontainerJsonFile = files.find(
			(f) => f.filePath === '.devcontainer/devcontainer.json'
		);
		expect(devcontainerJsonFile).toBeDefined();

		const devcontainerJson = JSON.parse(devcontainerJsonFile.content);

		// Check for unresolved variables in build
		expect(devcontainerJson.build).toEqual({ dockerfile: 'Dockerfile' });

		// Check for runArgs
		expect(devcontainerJson.runArgs).toContain('--sysctl');
		expect(devcontainerJson.runArgs).toContain('net.ipv6.conf.all.disable_ipv6=1');

		// Check that the workspace folder is set so terminals start in the project dir
		expect(devcontainerJson.workspaceFolder).toBe('/workspaces/my-project');

		// Check for unresolved variables in features
		const pythonFeature = devcontainerJson.features['ghcr.io/devcontainers/features/python:1'];
		expect(pythonFeature).toBeDefined();
		expect(pythonFeature.version).toBe('3.12');

		// Check for correct user in features
		expect(
			devcontainerJson.features['ghcr.io/devcontainers/features/common-utils:2'].username
		).toBe('vscode');

		// Check Dockerfile user
		const dockerfileFile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
		expect(dockerfileFile).toBeDefined();
		expect(dockerfileFile.content).toContain('USER vscode');
	});

	it('should generate valid Node devcontainer.json with node username and remoteUser', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			capabilities: ['devcontainer-node'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-node']);

		const devcontainerJsonFile = files.find(
			(f) => f.filePath === '.devcontainer/devcontainer.json'
		);
		expect(devcontainerJsonFile).toBeDefined();

		const devcontainerJson = JSON.parse(devcontainerJsonFile.content);

		// Check for unresolved variables in build
		expect(devcontainerJson.build).toEqual({ dockerfile: 'Dockerfile' });

		// Check for runArgs
		expect(devcontainerJson.runArgs).toContain('--sysctl');
		expect(devcontainerJson.runArgs).toContain('net.ipv6.conf.all.disable_ipv6=1');

		// Check that the workspace folder is set so terminals start in the project dir
		expect(devcontainerJson.workspaceFolder).toBe('/workspaces/my-project');

		// Check for correct username in features
		expect(
			devcontainerJson.features['ghcr.io/devcontainers/features/common-utils:2'].username
		).toBe('node');

		// Check for remoteUser
		expect(devcontainerJson.remoteUser).toBe('node');

		// Check Dockerfile copy and shell configuration
		const dockerfileFile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
		expect(dockerfileFile).toBeDefined();
		expect(dockerfileFile.content).toContain('COPY --chown=node:node .zshrc .p10k.zsh /home/node/');
		expect(dockerfileFile.content).toContain('# Ensure zsh is the default shell for the node user');
		expect(dockerfileFile.content).toContain('RUN chsh -s /usr/bin/zsh node');

		// Check tmux configuration
		const tmuxConfFile = files.find((f) => f.filePath === '.devcontainer/.tmux.conf');
		expect(tmuxConfFile).toBeDefined();
		expect(tmuxConfFile.content).toContain('set -g status-right "my-project"');
	});

	it('includes the multi-session worktree workflow in the generated .zshrc by default', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			capabilities: ['devcontainer-node'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-node']);

		const zshrcFile = files.find((f) => f.filePath === '.devcontainer/.zshrc');
		expect(zshrcFile).toBeDefined();

		const zshrc = zshrcFile.content;
		// Core wrapper, post-exit check, audit/remove helpers, and entry point.
		expect(zshrc).toContain('Goose Multi-Session Worktree Workflow');
		expect(zshrc).toContain('_wt_ensure()');
		expect(zshrc).toContain('_wt_check()');
		expect(zshrc).toContain('_wt_merge()');
		expect(zshrc).toContain('_wt_audit()');
		expect(zshrc).toContain('_wt_remove()');
		// Without the doppler capability the plain-binary wrapper is installed behind a guard
		expect(zshrc).toContain('typeset -f goose');
		expect(zshrc).toContain('goose() { _wt_ensure command goose "$@"; }');
		// Socket handling: hoisted locals + nullglob (N) qualifiers (no
		// 'sockets=(  )' noise, no 'no matches found' glob errors at startup).
		expect(zshrc).toContain('local current_user sockets socket');
		expect(zshrc).toContain('vscode-remote-containers-ipc-*.sock(N)');
		expect(zshrc).toContain('vscode-ssh-auth-*.sock(N)');
		expect(zshrc).not.toMatch(/\n\s+local sockets\b/);
		expect(zshrc).not.toMatch(/\n\s+local socket\b/);
	});

	it('overrides goose() with the Doppler wrapper when the doppler capability is selected', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			capabilities: ['devcontainer-node', 'doppler'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-node']);

		const zshrcFile = files.find((f) => f.filePath === '.devcontainer/.zshrc');
		expect(zshrcFile).toBeDefined();

		const zshrc = zshrcFile.content;
		// goose() itself is the Doppler wrapper (no separate goose-dev entry point)
		expect(zshrc).toContain('goose() {');
		expect(zshrc).toContain('_wt_ensure doppler run --project common --config dev');
		expect(zshrc).toContain('--project goose --config prd -- goose "$@"');
		expect(zshrc).not.toContain('goose-dev()');
		// Regression: the entry-point comment must NOT embed the multi-line
		// GOOSE_ALIAS. It previously rendered as '}) already defined goose(), it
		// already routes', producing a zsh parse error in every generated
		// devcontainer that selects the doppler capability.
		expect(zshrc).not.toContain('}) already defined');
		expect(zshrc).toContain(
			'# If a Doppler wrapper already defined goose() above, it already routes through'
		);
	});

	it('joins an existing tmux session for terminals starting outside the workspace', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			capabilities: ['devcontainer-rust'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-rust']);

		// devcontainer.json sets workspaceFolder so VS Code terminals start in the project
		const devcontainerJsonFile = files.find(
			(f) => f.filePath === '.devcontainer/devcontainer.json'
		);
		expect(devcontainerJsonFile).toBeDefined();
		const devcontainerJson = JSON.parse(devcontainerJsonFile.content);
		expect(devcontainerJson.workspaceFolder).toBe('/workspaces/my-project');

		// .zshrc falls back to scanning /workspaces/* for an existing session so
		// terminals that start in $HOME (before workspaceFolder kicks in) still join.
		const zshrcFile = files.find((f) => f.filePath === '.devcontainer/.zshrc');
		expect(zshrcFile).toBeDefined();

		const zshrc = zshrcFile.content;
		expect(zshrc).toContain('Determine a session name from the workspace folder name');
		expect(zshrc).toContain('for ws_dir in /workspaces/*(N/); do');
		expect(zshrc).toContain('candidate="${ws_dir:t}"');
		expect(zshrc).toContain('tmux has-session -t "$candidate" 2>/dev/null');
		expect(zshrc).toContain('start the named session');
	});
});

describe('DevContainer kitchen-sink gating (memo §2.9 / audit §4.5)', () => {
	it('only mounts volumes and forwardPorts for SELECTED capabilities', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			projectName: 'ports',
			capabilities: ['devcontainer-python', 'doppler', 'coding-agents'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-python']);
		const jsonFile = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
		const json = JSON.parse(jsonFile.content);

		// Selected: doppler + coding-agents (+ always-on tailscale state volume).
		expect(json.mounts.some((m) => m.includes('tailscale-state'))).toBe(true);
		expect(json.mounts.some((m) => m.includes('doppler-config'))).toBe(true);
		expect(json.mounts.some((m) => m.includes('gemini-cli-settings'))).toBe(true);
		// NOT selected: wrangler mount and the kitchen-sink forwardPorts are gone.
		expect(json.mounts.some((m) => m.includes('wrangler-config'))).toBe(false);
		expect(json.forwardPorts).toEqual([]);

		// post-create-setup.sh contains only selected-capability tooling.
		const setup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(setup.content).toContain('.doppler');
		expect(setup.content).toContain('.gemini');
		expect(setup.content).not.toContain('.wrangler');
		expect(setup.content).not.toContain('specdag');
		expect(setup.content).not.toContain('nanobanana');
	});
});
