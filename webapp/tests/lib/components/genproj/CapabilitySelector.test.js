// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/svelte';
import CapabilitySelector from '$lib/components/genproj/CapabilitySelector.svelte';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { capabilities } from '$lib/config/capabilities.js';

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

	it('renders capability categories and items', () => {
		render(CapabilitySelector, {
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

	it('shows benefits toggle button', async () => {
		render(CapabilitySelector, {
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Benefits toggle should be present
		const toggles = screen.getAllByText('Why use this?');
		expect(toggles.length).toBeGreaterThan(0);
	});

	it('shows configuration when selected', async () => {
		render(CapabilitySelector, {
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
		render(CapabilitySelector, {
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
		const { container } = render(CapabilitySelector, {
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

	it('shows missing dependencies warning for gitguardian', () => {
		render(CapabilitySelector, {
			capabilities: mockCapabilities,
			selectedCapabilities: [],
			configuration: {}
		});

		// Find the GitGuardian card (or look for text within it)
		expect(screen.getByText('Requires: CircleCI Integration')).toBeTruthy();
	});
});
