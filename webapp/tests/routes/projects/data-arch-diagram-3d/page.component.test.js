import { render } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Page from '../../../../src/routes/projects/data-arch-diagram-3d/+page.svelte';

// Mock Threlte components since they rely on WebGL which isn't available in JSDOM
vi.mock('@threlte/core', () => ({
	Canvas: vi.fn().mockImplementation(({ children }) => children),
    T: {
        PerspectiveCamera: vi.fn(),
        DirectionalLight: vi.fn(),
        AmbientLight: vi.fn(),
        Group: vi.fn(),
        Mesh: vi.fn(),
        BoxGeometry: vi.fn(),
        MeshStandardMaterial: vi.fn(),
        CylinderGeometry: vi.fn(),
        SphereGeometry: vi.fn(),
        MeshBasicMaterial: vi.fn(),
        PointLight: vi.fn()
    },
    useTask: vi.fn()
}));

vi.mock('@threlte/extras', () => ({
	OrbitControls: vi.fn(),
    Text: vi.fn(),
    Float: vi.fn()
}));

// Mock Scene component to avoid deep rendering issues if any
vi.mock('../../../../../src/routes/projects/data-arch-diagram-3d/Scene.svelte', () => ({
    default: vi.fn()
}));

describe('3D Data Architecture Page', () => {
	it('renders the page structure', () => {
		const { container } = render(Page);

        // Check for header and footer presence (assuming they render some identifiable content)
        // Since we are mocking Scene, we mainly check if the wrapper is there
		expect(container.querySelector('main')).toBeTruthy();
	});
});
