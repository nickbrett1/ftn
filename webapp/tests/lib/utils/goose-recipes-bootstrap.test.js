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
	// genproj-goose-env-refs regression: goose does NOT expand ${VAR}/$VAR in a
	// stdio extension's env map — the literal text is used as the token → MCP
	// 401 on every call. circleci/sonarcloud declare dependencies: ['doppler'],
	// so without doppler the extension is simply NOT registered (the old
	// bare-npx + ${VAR} env block is the anti-pattern this suite must never see).
	it('does not register the circleci extension when doppler is absent (no ${VAR} env block)', () => {
		const script = generateGooseSetupScript({ capabilities: ['circleci'], configuration: {} });
		expect(script).not.toContain('ensure_goose_extension "circleci"');
		expect(script).not.toContain('CIRCLECI_TOKEN');
		expect(script).not.toContain('$CIRCLECI_TOKEN');
		expect(script).not.toContain('cmd: npx');
	});

	it('registers the circleci extension via doppler when the doppler capability is selected', () => {
		const script = generateGooseSetupScript({
			capabilities: ['circleci', 'doppler'],
			configuration: {}
		});
		expect(script).toContain('ensure_goose_extension "circleci"');
		expect(script).toContain('cmd: doppler');
		expect(script).toContain('"@circleci/mcp-server-circleci"');
		expect(script).not.toContain('CIRCLECI_TOKEN');
	});

	it('registers xcode-native (no secrets) and skips sonarqube without doppler', () => {
		const script = generateGooseSetupScript({
			capabilities: ['sonarcloud', 'xcode-development'],
			configuration: {}
		});
		expect(script).not.toContain('ensure_goose_extension "sonarqube"');
		expect(script).not.toContain('SONAR_TOKEN');
		expect(script).toContain('ensure_goose_extension "xcode-native"');
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

	it('wires the doppler-wrapped circleci extension into post-create-setup.sh for a nas-port-mcp-like project (no coding-agents)', async () => {
		// circleci requires doppler (dependency resolver auto-adds it), so the
		// generated goose block is the doppler wrapper — never a ${VAR} env ref.
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
		expect(setup.content).toContain('ensure_goose_extension "circleci"');
		expect(setup.content).toContain('cmd: doppler');
		expect(setup.content).toContain('"@circleci/mcp-server-circleci"');
		expect(setup.content).not.toContain('CIRCLECI_TOKEN');
	});
});
