// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/svelte';
import CapabilitySelector from '$lib/components/genproj/CapabilitySelector.svelte';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { capabilities } from '$lib/config/capabilities.js';

// The project-level "Primary Language" controls, named once so the tests
// read the same as the markup.
const LANGUAGE_SELECT = 'project-config-language';
const LANGUAGE_IMPLIED = 'project-config-language-implied';

describe('CapabilitySelector', () => {
	const mockCapabilities = capabilities;
	const mockDispatch = vi.fn();

	beforeAll(() => {
		// Mock element.animate for Svelte 5 transitions in JSDOM
		Element.prototype.animate = vi.fn().mockImplementation(() => ({
			finished: Promise.resolve(),
			onfinish: () => {},
			cancel: () => {},
			play: () => {},
			pause: () => {},
			reverse: () => {}
		}));
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// The sections come from the catalog (genproj), not from the component:
	// ids, headings and order all travel in the payload, so a new category needs
	// no client redeploy. Mirrors the catalog's `categories` block.
	const CATEGORIES = [
		{ id: 'core', label: 'Core Capabilities (Always Included)', order: 10 },
		{ id: 'agents', label: 'Agents', order: 20 },
		{ id: 'frameworks', label: 'Frameworks', order: 30 },
		{ id: 'devcontainer', label: 'Development Containers', order: 40 },
		{ id: 'embedded', label: 'Embedded / Microcontrollers', order: 50 },
		{ id: 'apple-development', label: 'Apple Development', order: 60 },
		{ id: 'ci-cd', label: 'CI/CD', order: 70 },
		{ id: 'code-quality', label: 'Code Quality', order: 80 },
		{ id: 'secrets', label: 'Secrets Management', order: 90 },
		{ id: 'deployment', label: 'Deployment', order: 100 },
		{ id: 'monitoring', label: 'Monitoring & Testing', order: 110 },
		{ id: 'project-structure', label: 'Dependency Management', order: 120 },
		{ id: 'internal', label: 'Internal', order: 130, visible: false }
	];

	// A capability as the catalog describes one: every field the component reads
	// is present, so a test only states what it is actually about.
	function makeCapability(overrides) {
		return {
			id: 'capability',
			name: 'Capability',
			description: '',
			category: 'core',
			icon: 'code',
			iconColor: 'blue',
			selectedByDefault: false,
			provides: [],
			dependencies: [],
			conflicts: [],
			requiresAuth: [],
			authServices: [],
			externalServices: [],
			vscodeExtensions: [],
			benefits: [],
			links: [],
			configurationSchema: { properties: {} },
			...overrides
		};
	}

	function renderSelector(props) {
		return render(CapabilitySelector, { categories: CATEGORIES, ...props });
	}

	it('renders capability categories and items', () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Check for category headers
		expect(screen.getByText('Development Containers')).toBeTruthy();
		expect(screen.getByText('CI/CD')).toBeTruthy();

		// Check for capability cards (names)
		expect(screen.getByText('Node.js DevContainer')).toBeTruthy();
	});

	it('renders the Agents section for agent capabilities', () => {
		// Agents are their own UI section (genproj `category: 'agents'`), not part
		// of "Core Capabilities". Its heading and position come from the catalog.
		renderSelector({
			capabilities: [
				makeCapability({ id: 'coding-agents', name: 'AI Coding Agents', category: 'agents' })
			],
			selectedCapabilities: [],
			configuration: {}
		});

		expect(screen.getByText('Agents')).toBeTruthy();
		expect(screen.getByText('AI Coding Agents')).toBeTruthy();
	});

	it('takes a section heading from the catalog, not from the component', () => {
		// The heading is data. Renaming a section is a catalog change alone — the
		// component must render whatever label it is handed.
		renderSelector({
			categories: [{ id: 'agents', label: 'Renamed In The Catalog', order: 10 }],
			capabilities: [
				makeCapability({ id: 'coding-agents', name: 'AI Coding Agents', category: 'agents' })
			],
			selectedCapabilities: [],
			configuration: {}
		});

		expect(screen.getByText('Renamed In The Catalog')).toBeTruthy();
	});

	it('does not render a section the catalog marks invisible', () => {
		// `internal` is a dependency-only category: docker is always applied as a
		// dependency, so it needs no section of its own.
		renderSelector({
			capabilities: [
				makeCapability({ id: 'docker', name: 'Docker Container', category: 'internal' })
			],
			selectedCapabilities: [],
			configuration: {}
		});

		expect(screen.queryByText('Internal')).toBeNull();
		expect(screen.queryByText('Docker Container')).toBeNull();
	});

	it('renders a category the catalog did not declare, rather than losing it', () => {
		// The safety net: a capability whose category is missing from the catalog
		// still shows, last and under its raw id. Silence would hide a capability
		// the user is entitled to see — that was the original bug.
		renderSelector({
			categories: [{ id: 'core', label: 'Core Capabilities (Always Included)', order: 10 }],
			capabilities: [
				makeCapability({ id: 'editor-tools', name: 'Editor Tools', category: 'core' }),
				makeCapability({
					id: 'brand-new',
					name: 'Brand New Thing',
					category: 'a-category-nobody-declared'
				})
			],
			selectedCapabilities: [],
			configuration: {}
		});

		expect(screen.getByText('a-category-nobody-declared')).toBeTruthy();
		expect(screen.getByText('Brand New Thing')).toBeTruthy();
	});

	it('shows benefits toggle button', async () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Benefits toggle should be present
		const toggles = screen.getAllByText('Why use this?');
		expect(toggles.length).toBeGreaterThan(0);
	});

	it('shows configuration when selected', async () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: ['dependabot'],
			configuration: {}
		});

		expect(screen.getByText('Update Schedule')).toBeTruthy();
	});

	// The catalog is the single source of truth for both of these: genproj
	// publishes `enumLabels` for a label's human name and `{{projectName}}` for
	// a default that IS the project's name. A client that hardcoded either would
	// need editing the day a target is added.
	const targetCapability = {
		id: 'github-release',
		name: 'GitHub Release',
		description: 'Releases',
		category: 'deployment',
		icon: 'github',
		iconColor: 'green',
		selectedByDefault: false,
		provides: [],
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		authServices: [],
		externalServices: [],
		vscodeExtensions: [],
		benefits: [],
		links: [],
		configurationSchema: {
			type: 'object',
			properties: {
				targets: {
					type: 'array',
					items: {
						type: 'string',
						enum: ['aarch64-apple-darwin', 'x86_64-unknown-linux-musl'],
						enumLabels: {
							'aarch64-apple-darwin': 'macOS (Apple silicon)',
							'x86_64-unknown-linux-musl': 'Linux x86-64 (musl)'
						}
					},
					default: []
				},
				launcherName: {
					type: 'string',
					default: '{{projectName}}'
				}
			}
		}
	};

	it('names an enum option for a person and keeps the value', () => {
		renderSelector({
			capabilities: [targetCapability],
			selectedCapabilities: ['github-release'],
			// The value is the triple, as it always was: the name is a label.
			configuration: { 'github-release': { targets: ['aarch64-apple-darwin'] } },
			projectName: 'my-app'
		});

		expect(screen.getByText('macOS (Apple silicon)')).toBeTruthy();
		// The triple is still on screen beside it - it is what the build takes,
		// and what a person pastes into a bug report.
		expect(screen.getByText('aarch64-apple-darwin')).toBeTruthy();

		// The ticked box is the one labelled with the human name, and the other
		// is not: the name cannot be pointing at the wrong value.
		const darwin = screen.getByText('macOS (Apple silicon)').closest('label');
		const musl = screen.getByText('Linux x86-64 (musl)').closest('label');
		expect(darwin.querySelector('input[type="checkbox"]').checked).toBe(true);
		expect(musl.querySelector('input[type="checkbox"]').checked).toBe(false);
	});

	it('shows a project-name default as a hint, not as a value', () => {
		const { container } = renderSelector({
			capabilities: [targetCapability],
			selectedCapabilities: ['github-release'],
			configuration: {},
			projectName: 'my-app'
		});

		const input = container.querySelector('input#github-release-launcherName');
		expect(input).toBeTruthy();
		expect(input.getAttribute('placeholder')).toBe('my-app');
		// Empty, so an untouched field keeps meaning "whatever the project is
		// called" rather than freezing the name as it was typed.
		expect(input.value).toBe('');
	});

	// Project-level configuration (the catalog's top-level `configurationSchema`)
	// is the only place a project-wide field like the primary `language` is
	// declared. It belongs to no capability, so it renders in its own block above
	// the sections. Both the field list and its option labels are catalog data.
	const projectSchema = {
		type: 'object',
		properties: {
			language: {
				type: 'string',
				enum: ['python', 'node', 'java', 'rust'],
				enumLabels: { node: 'Node.js' },
				description: 'Primary Language: the one the project builds and releases.'
			}
		}
	};

	it('renders the project-level configuration from the catalog schema', () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {},
			configurationSchema: projectSchema
		});

		expect(screen.getByTestId('project-configuration')).toBeTruthy();
		// The field is spelled out as "Primary Language"; the long catalog
		// description is NOT shown as helper text.
		expect(screen.getByText('Primary Language')).toBeTruthy();
		expect(
			screen.queryByText('Primary Language: the one the project builds and releases.')
		).toBeNull();

		// Nothing is implied and no override is chosen yet.
		expect(screen.getByTestId(LANGUAGE_IMPLIED).textContent.trim()).toBe('None');
		expect(screen.getByTestId(LANGUAGE_SELECT).value).toBe('');
	});

	it('orders the override options alphabetically and capitalises them', () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {},
			configurationSchema: projectSchema
		});

		const options = [...screen.getByTestId(LANGUAGE_SELECT).querySelectorAll('option')].map(
			(option) => ({ value: option.value, label: option.textContent })
		);
		// A blank "no override" first, then the languages alphabetically by name.
		expect(options).toEqual([
			{ value: '', label: '' },
			{ value: 'java', label: 'Java' },
			{ value: 'node', label: 'Node.js' },
			{ value: 'python', label: 'Python' },
			{ value: 'rust', label: 'Rust' }
		]);
	});

	it('marks the project configuration required when told to', () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: ['devcontainer-node', 'devcontainer-python'],
			configuration: {},
			configurationSchema: projectSchema,
			projectConfigurationRequired: true
		});

		expect(screen.getByTestId('project-config-required')).toBeTruthy();
		// Required and unset: two devcontainers make the implication ambiguous,
		// so the override is blank and must be chosen.
		expect(screen.getByTestId(LANGUAGE_SELECT).value).toBe('');
		expect(screen.getByTestId(LANGUAGE_IMPLIED).textContent.trim()).toBe('Multiple');
	});

	it('shows the language implied by a single devcontainer as read-only text', () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: ['devcontainer-python'],
			configuration: {},
			configurationSchema: projectSchema
		});

		// One devcontainer implies the language; it is shown in the read-only
		// "Implied" text and is NOT written into `configuration`, so the override
		// itself stays blank.
		expect(screen.getByTestId(LANGUAGE_IMPLIED).textContent.trim()).toBe('Python');
		expect(screen.getByTestId(LANGUAGE_SELECT).value).toBe('');
	});

	it('reports an ambiguous implication with two devcontainer languages', () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: ['devcontainer-python', 'devcontainer-rust'],
			configuration: {},
			configurationSchema: projectSchema,
			projectConfigurationRequired: true
		});

		// Two distinct languages cannot imply one, so the read-only text says so
		// and nothing is pre-selected.
		expect(screen.getByTestId(LANGUAGE_IMPLIED).textContent.trim()).toBe('Multiple');
		expect(screen.getByTestId(LANGUAGE_SELECT).value).toBe('');
	});

	it('keeps an explicit override regardless of what the selection implies', () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: ['devcontainer-python'],
			configuration: { language: 'rust' },
			configurationSchema: projectSchema
		});

		// The override sticks even though a single devcontainer would imply
		// Python; the implied text still reports the implication.
		expect(screen.getByTestId(LANGUAGE_SELECT).value).toBe('rust');
		expect(screen.getByTestId(LANGUAGE_IMPLIED).textContent.trim()).toBe('Python');
	});

	it('shows missing dependencies warning for gitguardian', () => {
		renderSelector({
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Find the GitGuardian card (or look for text within it)
		expect(screen.getByText('Requires: CircleCI Integration')).toBeTruthy();
	});
});
