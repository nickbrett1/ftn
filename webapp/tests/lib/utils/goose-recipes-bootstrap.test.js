import { describe, it, expect } from 'vitest';
import {
	generateGooseSetupScript,
	generateAllFiles,
	TemplateEngine
} from '$lib/utils/file-generator';

describe('goose recipes bootstrap in generated projects', () => {
	const ctx = { capabilities: ['coding-agents', 'doppler'], configuration: {} };

	it('writes an extensions-only config.yaml when none exists (MCPHub dev group default)', () => {
		const script = generateGooseSetupScript(ctx);
		// Migration (goose-mcp-groups-migration §4): with no host ~/.config/goose
		// bind-mount, genproj now WRITES ~/.config/goose/config.yaml when absent
		// (extensions only). mcphub-dev → MCPHub `dev` group, auth-off.
		expect(script).toContain('cat > "$CONFIG" <<\'GOOSECFGEOF\'');
		expect(script).toContain('GOOSECFGEOF');
		expect(script).toContain('extensions:');
		expect(script).toContain('mcphub-dev:');
		expect(script).toContain('uri: http://nas:8781/mcp/dev');
		// Extensions-only: NO provider block is emitted (resolves from Doppler env).
		expect(script).not.toContain('provider:');
	});

	it('keeps an existing config.yaml untouched (never clobbers)', () => {
		const script = generateGooseSetupScript(ctx);
		expect(script).toContain('if [ -f "$CONFIG" ]');
		expect(script).toContain('Keeping existing $CONFIG');
	});

	it('drops per-cap circleci (covered by dev) but keeps sonarqube as an exception (not in dev)', () => {
		const script = generateGooseSetupScript({
			capabilities: ['circleci', 'sonarcloud', 'doppler', 'coding-agents'],
			configuration: {}
		});
		// mcphub-dev is the default toolset regardless of capabilities.
		expect(script).toContain('mcphub-dev:');
		// circleci is carried by the dev group (circleci-lite) → no stdio block.
		expect(script).not.toContain('@circleci/mcp-server-circleci');
		expect(script).not.toContain('CIRCLECI_TOKEN');
		// sonarqube is NOT in the dev group → kept as a doppler-wrapped exception.
		expect(script).toContain('sonarqube:');
		expect(script).toContain('cmd: doppler');
		expect(script).toContain('sonarqube-mcp-server');
		expect(script).not.toContain('ensure_goose_extension');
		expect(script).not.toContain('fintechnick:');
	});

	it('clones/pulls the recipes repo into the global recipes dir', () => {
		const script = generateGooseSetupScript(ctx);
		expect(script).toContain('$HOME/.config/goose/recipes');
		expect(script).toContain('git clone --quiet https://github.com/nickbrett1/goose-recipes.git');
		expect(script).toContain('git pull --ff-only --quiet');
	});

	it('keeps only genuinely-local/remote non-hub exceptions (xcode-native, svelte)', () => {
		const script = generateGooseSetupScript({
			capabilities: ['xcode-development', 'sveltekit'],
			configuration: {}
		});
		expect(script).toContain('mcphub-dev:');
		expect(script).toContain('xcode-native:');
		expect(script).toContain('mac-studio:9876/sse');
		expect(script).toContain('svelte:');
		expect(script).toContain('uri: https://mcp.svelte.dev/mcp');
	});
});

describe('generated post-create-setup.sh goose config (round-4 rewrite: MCPHub dev group)', () => {
	it('emits the mcphub-dev extension for a nas-port-mcp-like project (no per-capability stdio)', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();
		const files = await generateAllFiles({
			projectName: 'nas-port-mcp',
			capabilities: ['devcontainer-python', 'docker-container', 'circleci', 'doppler'],
			configuration: {
				'docker-container': { entrypoint: ['/usr/local/bin/entrypoint.sh'] }
			}
		});
		const setup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(setup).toBeDefined();
		expect(setup.content).toContain('mcphub-dev:');
		expect(setup.content).toContain('uri: http://nas:8781/mcp/dev');
		// The circleci capability no longer wires a per-capability stdio block.
		expect(setup.content).not.toContain('ensure_goose_extension');
		expect(setup.content).not.toContain('@circleci/mcp-server-circleci');
		expect(setup.content).not.toContain('CIRCLECI_TOKEN');
	});
});
