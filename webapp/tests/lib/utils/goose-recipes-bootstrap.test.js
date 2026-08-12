import { describe, it, expect } from 'vitest';
import { generateGooseSetupScript } from '$lib/utils/file-generator';

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
