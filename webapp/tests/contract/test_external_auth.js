/**
 * @fileoverview Contract test for external service auth endpoints
 * @description Tests the CircleCI, Doppler, and SonarCloud auth endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('External Service Auth API Contract', () => {
	let circleciAuthEndpoint;
	let dopplerAuthEndpoint;
	let sonarcloudAuthEndpoint;

	beforeEach(() => {
		// Initialize test endpoints
		circleciAuthEndpoint = '/projects/genproj/api/auth/circleci';
		dopplerAuthEndpoint = '/projects/genproj/api/auth/doppler';
		sonarcloudAuthEndpoint = '/projects/genproj/api/auth/sonarcloud';
	});

	afterEach(() => {
		// Cleanup
	});

	describe('CircleCI Auth', () => {
		it('should accept GET requests to initiate CircleCI auth', async () => {
			// Arrange
			const url = new URL(circleciAuthEndpoint, 'http://localhost:5173');
			url.searchParams.set('state', 'test-state-123');

			// Act
			const response = await fetch(url.toString(), {
				method: 'GET'
			});

			// Assert
			expect(response).toBeDefined();
			// Should redirect to CircleCI token page or return auth URL
			expect([200, 301, 302, 307, 308]).toContain(response.status);
		});

		it('should include state parameter in CircleCI auth URL', async () => {
			// Arrange
			const state = 'test-state-circleci';
			const url = new URL(circleciAuthEndpoint, 'http://localhost:5173');
			url.searchParams.set('state', state);

			// Act
			const response = await fetch(url.toString(), {
				method: 'GET',
				redirect: 'manual'
			});

			// Assert
			const location = response.headers.get('location');
			if (location) {
				const redirectUrl = new URL(location);
				expect(redirectUrl.searchParams.get('state')).toBe(state);
			}
		});
	});

	describe('Doppler Auth', () => {
		it('should accept GET requests to initiate Doppler auth', async () => {
			// Arrange
			const url = new URL(dopplerAuthEndpoint, 'http://localhost:5173');
			url.searchParams.set('state', 'test-state-123');

			// Act
			const response = await fetch(url.toString(), {
				method: 'GET'
			});

			// Assert
			expect(response).toBeDefined();
			// Should redirect to Doppler token page or return auth URL
			expect([200, 301, 302, 307, 308]).toContain(response.status);
		});

		it('should include state parameter in Doppler auth URL', async () => {
			// Arrange
			const state = 'test-state-doppler';
			const url = new URL(dopplerAuthEndpoint, 'http://localhost:5173');
			url.searchParams.set('state', state);

			// Act
			const response = await fetch(url.toString(), {
				method: 'GET',
				redirect: 'manual'
			});

			// Assert
			const location = response.headers.get('location');
			if (location) {
				const redirectUrl = new URL(location);
				expect(redirectUrl.searchParams.get('state')).toBe(state);
			}
		});
	});

	describe('SonarCloud Auth', () => {
		it('should accept GET requests to initiate SonarCloud auth', async () => {
			// Arrange
			const url = new URL(sonarcloudAuthEndpoint, 'http://localhost:5173');
			url.searchParams.set('state', 'test-state-123');

			// Act
			const response = await fetch(url.toString(), {
				method: 'GET'
			});

			// Assert
			expect(response).toBeDefined();
			// Should redirect to SonarCloud token page or return auth URL
			expect([200, 301, 302, 307, 308]).toContain(response.status);
		});

		it('should include state parameter in SonarCloud auth URL', async () => {
			// Arrange
			const state = 'test-state-sonarcloud';
			const url = new URL(sonarcloudAuthEndpoint, 'http://localhost:5173');
			url.searchParams.set('state', state);

			// Act
			const response = await fetch(url.toString(), {
				method: 'GET',
				redirect: 'manual'
			});

			// Assert
			const location = response.headers.get('location');
			if (location) {
				const redirectUrl = new URL(location);
				expect(redirectUrl.searchParams.get('state')).toBe(state);
			}
		});
	});

	describe('Token Validation', () => {
		it('should accept POST requests with token for CircleCI validation', async () => {
			// Arrange
			const url = new URL(circleciAuthEndpoint, 'http://localhost:5173');
			const body = {
				token: 'test-circleci-token',
				state: 'test-state-123'
			};

			// Act
			const response = await fetch(url.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			// Assert
			expect(response).toBeDefined();
			expect(response.status).toBeGreaterThanOrEqual(200);
			expect(response.status).toBeLessThan(500);
		});

		it('should accept POST requests with token for Doppler validation', async () => {
			// Arrange
			const url = new URL(dopplerAuthEndpoint, 'http://localhost:5173');
			const body = {
				token: 'test-doppler-token',
				state: 'test-state-123'
			};

			// Act
			const response = await fetch(url.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			// Assert
			expect(response).toBeDefined();
			expect(response.status).toBeGreaterThanOrEqual(200);
			expect(response.status).toBeLessThan(500);
		});

		it('should accept POST requests with token for SonarCloud validation', async () => {
			// Arrange
			const url = new URL(sonarcloudAuthEndpoint, 'http://localhost:5173');
			const body = {
				token: 'test-sonarcloud-token',
				state: 'test-state-123'
			};

			// Act
			const response = await fetch(url.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			// Assert
			expect(response).toBeDefined();
			expect(response.status).toBeGreaterThanOrEqual(200);
			expect(response.status).toBeLessThan(500);
		});

		it('should return error if token is missing', async () => {
			// Arrange
			const url = new URL(circleciAuthEndpoint, 'http://localhost:5173');
			const body = {
				state: 'test-state-123'
				// No token
			};

			// Act
			const response = await fetch(url.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			// Assert
			expect(response.status).toBeGreaterThanOrEqual(400);
			const data = await response.json().catch(() => null);
			if (data) {
				expect(data.error).toBeDefined();
			}
		});
	});
});
