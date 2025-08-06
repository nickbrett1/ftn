import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Button from '../src/lib/components/Button.svelte';

describe('Button Component', () => {
	it('should handle onclick events correctly', async () => {
		const mockOnClick = vi.fn();
		
		const { getByRole } = render(Button, {
			props: {
				onclick: mockOnClick,
				children: () => 'Test Button'
			}
		});

		const button = getByRole('button');
		expect(button).toBeTruthy();
		expect(button.textContent).toBe('Test Button');

		// Click the button
		await fireEvent.click(button);

		// Verify the onclick handler was called
		expect(mockOnClick).toHaveBeenCalledTimes(1);
	});

	it('should render as a link when href is provided', () => {
		const { container } = render(Button, {
			props: {
				href: '/test-link',
				children: () => 'Link Button'
			}
		});

		const link = container.querySelector('a');
		expect(link).toBeTruthy();
		expect(link.href).toContain('/test-link');
		expect(link.textContent).toBe('Link Button');
	});

	it('should apply correct classes based on variant and size', () => {
		const { getByRole } = render(Button, {
			props: {
				variant: 'success',
				size: 'lg',
				children: () => 'Styled Button'
			}
		});

		const button = getByRole('button');
		expect(button.className).toContain('bg-green-600');
		expect(button.className).toContain('py-3 px-6');
	});
});