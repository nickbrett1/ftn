import { describe, it, expect } from 'vitest';
import {
	generateGooseSetupScript,
	generateAllFiles,
	TemplateEngine
} from '$lib/utils/file-generator';

describe('goose recipes bootstrap in generated projects', () => {
	const ctx = { capabilities: ['coding-agents', 'doppler'], configuration: {} };

	it('never overwrites an existing goose config (provider + extensions preserved)', () => {
		const script = generateGooseSetupScript(ctx);
		// Regression: genproj used to `cat > ~/.config/goose/config.yaml` with a
		// hardcoded provider-less config, which surfaced in generated projects as
		// "error: No provider configured. Run 'goose configure' first." and lost
		// the user's extensions. The script must not write or clobber config.yaml.
		expect(script).not.toContain('cat > "$HOME/.config/goose/config.yaml"');
		expect(script).not.toContain('GOOSECFGEOF');
		expect(script).toContain('if [ -f "$HOME/.config/goose/config.yaml" ]');
		expect(script).toContain('Keeping existing $HOME/.config/goose/config.yaml');
	});

	it('clones/pulls the recipes repo into the global recipes dir', () => {
		const script = generateGooseSetupScript(ctx);
		expect(script).toContain('$HOME/.config/goose/recipes');
		expect(script).toContain('git clone --quiet https://github.com/nickbrett1/goose-recipes.git');
		expect(script).toContain('git pull --ff-only --quiet');
	});

	it('does not fabricate MCP server entries or a provider in the setup script', () => {
		const script = generateGooseSetupScript(ctx);
		expect(script).not.toContain('fintechnick:');
		expect(script).not.toContain('extensions:');
		expect(script).not.toContain('GOOSE_RECIPE_GITHUB_REPO:');
	});
});

describe('project-selected goose MCP extensions (round-4: circleci/sonarcloud/xcode)', () => {
	it('registers the circleci extension with npx + token env when doppler is not selected', () => {
		const script = generateGooseSetupScript({ capabilities: ['circleci'], configuration: {} });
		expect(script).toContain('ensure_goose_extension "circleci"');
		expect(script).toContain('"@circleci/mcp-server-circleci"');
		expect(script).toContain('CIRCLECI_TOKEN: "${CIRCLECI_TOKEN}"');
		expect(script).toContain('cmd: npx');
		expect(script).not.toContain('cmd: doppler');
	});

	it('registers the circleci extension via doppler when the doppler capability is selected', () => {
		const script = generateGooseSetupScript({
			capabilities: ['circleci', 'doppler'],
			configuration: {}
		});
		expect(script).toContain('ensure_goose_extension "circleci"');
		expect(script).toContain('cmd: doppler');
		expect(script).toContain('"@circleci/mcp-server-circleci"');
	});

	it('registers sonarqube and xcode-native extensions when their capabilities are selected', () => {
		const script = generateGooseSetupScript({
			capabilities: ['sonarcloud', 'xcode-development'],
			configuration: {}
		});
		expect(script).toContain('ensure_goose_extension "sonarqube"');
		expect(script).toContain('ensure_goose_extension "xcode-native"');
		expect(script).toContain('SONAR_TOKEN: "${SONAR_TOKEN}"');
		expect(script).toContain('mac-studio:9876/sse');
	});

	it('emits no extension merge when no MCP-relevant capability is selected', () => {
		const script = generateGooseSetupScript({
			capabilities: ['devcontainer-python'],
			configuration: {}
		});
		expect(script).not.toContain('ensure_goose_extension');
		expect(script).not.toContain('extensions:');
	});

	it('wires the circleci extension into post-create-setup.sh for a nas-port-mcp-like project (no coding-agents)', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();
		const files = await generateAllFiles({
			projectName: 'nas-port-mcp',
			capabilities: ['devcontainer-python', 'docker-container', 'circleci'],
			configuration: {
				'docker-container': { entrypoint: ['/usr/local/bin/entrypoint.sh'] }
			}
		});
		const setup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(setup).toBeDefined();
		expect(setup.content).toContain('ensure_goose_extension "circleci"');
		expect(setup.content).toContain('"@circleci/mcp-server-circleci"');
		expect(setup.content).toContain('CIRCLECI_TOKEN: "${CIRCLECI_TOKEN}"');
	});
});
