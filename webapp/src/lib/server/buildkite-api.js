/**
 * Buildkite API Service
 *
 * Creates and wires up a Buildkite pipeline for a freshly generated repository:
 * create the pipeline, register its GitHub webhook, trigger the first build.
 *
 * Mirrors `circleci-api.js`, including the best-effort/retry posture, because
 * the two providers fail in the same shape: the repository is brand new, the
 * provider indexes it asynchronously, and the first call can fail for a reason
 * that has nothing to do with the request.
 *
 * @fileoverview Server-side Buildkite API integration service
 */

import { BaseAPIService } from './base-api-service.js';

/**
 * @typedef {Object} BuildkitePipeline
 * @property {string} id - Pipeline UUID
 * @property {string} slug - Pipeline slug (derived from the name)
 * @property {string} name - Pipeline name
 * @property {string} webUrl - URL of the pipeline in the Buildkite UI
 * @property {string} [webhookUrl] - The pipeline's GitHub webhook URL, if any
 */

/**
 * Buildkite API service class
 */
export class BuildkiteAPIService extends BaseAPIService {
	/**
	 * Creates a new Buildkite API service instance
	 * @param {string} token - Buildkite API token (write scope: write_pipelines)
	 * @param {Object} [options] - Optional configuration
	 * @param {Object} [options.createRetry] - Retry policy for pipeline creation.
	 *   Buildkite's GitHub App indexes a brand-new repository asynchronously, so
	 *   the repo can be invisible to the API for a short window right after
	 *   creation. Retrying with backoff lets eventual consistency catch up.
	 * @param {number} [options.createRetry.attempts=6] - Max attempts (incl. first)
	 * @param {number} [options.createRetry.baseDelayMs=5000] - First retry delay
	 * @param {number} [options.createRetry.maxDelayMs=40000] - Max retry delay
	 * @param {number} [options.createRetry.backoffFactor=2] - Exponential factor
	 */
	constructor(token, options = {}) {
		super(
			token,
			'https://api.buildkite.com/v2',
			{
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			'Buildkite'
		);
		this.createRetry = {
			attempts: 6,
			baseDelayMs: 5000,
			maxDelayMs: 40000,
			backoffFactor: 2,
			...options.createRetry
		};
	}

	/**
	 * The pipeline object's own configuration.
	 *
	 * A pipeline created through this API must carry a non-empty
	 * `configuration`: omit it and the create is rejected outright, send an
	 * empty string and Buildkite accepts it but then runs builds with **zero
	 * steps** (an empty config does *not* fall back to `.buildkite/pipeline.yml`,
	 * which is the assumption that costs an afternoon). So we always send the
	 * standard one-step wrapper, and the repository file stays the source of
	 * truth for the actual steps.
	 *
	 * @param {string} [pipelineFile] - Repo-relative pipeline file to upload
	 * @returns {string} Pipeline configuration YAML
	 */
	static configurationWrapper(pipelineFile = '.buildkite/pipeline.yml') {
		return [
			'steps:',
			'  - label: ":pipeline: Upload repo pipeline"',
			'    key: repo-pipeline',
			`    command: "buildkite-agent pipeline upload ${pipelineFile}"`,
			''
		].join('\n');
	}

	/**
	 * Gets the token's scopes and owning user. Useful as a preflight: a
	 * read-only token fails pipeline creation with a 403, which reads like a
	 * permission mystery rather than "you gave me the wrong token".
	 * @returns {Promise<Object>} Token information including `scopes`
	 */
	async getAccessToken() {
		const response = await this.makeRequest('/access-token');
		return response.json();
	}

	/**
	 * Lists pipelines in an organization
	 * @param {string} org - Organization slug
	 * @returns {Promise<BuildkitePipeline[]>} Pipelines
	 */
	async listPipelines(org) {
		const response = await this.makeRequest(`/organizations/${org}/pipelines`);
		return response.json();
	}

	/**
	 * Gets a single pipeline by slug
	 * @param {string} org - Organization slug
	 * @param {string} slug - Pipeline slug
	 * @returns {Promise<BuildkitePipeline>} Pipeline
	 */
	async getPipeline(org, slug) {
		const response = await this.makeRequest(`/organizations/${org}/pipelines/${slug}`);
		return response.json();
	}

	/**
	 * Creates the pipeline for a repository, idempotently.
	 *
	 * A pipeline whose name already exists is treated as success (the name is
	 * derived from the repository, so regenerating a project must not fail), and
	 * the caller continues on to register the webhook — which is itself
	 * idempotent. That makes the whole flow safe to re-run.
	 *
	 * @param {string} org - Organization slug
	 * @param {Object} options - Pipeline options
	 * @param {string} options.name - Pipeline name (usually the repo name)
	 * @param {string} options.repository - Clone URL, e.g. https://github.com/owner/repo.git
	 * @param {string} [options.clusterId] - Cluster UUID; mandatory when the org has one
	 * @param {string} [options.defaultBranch='main'] - Default branch
	 * @param {Object} [options.settings] - Provider settings, e.g. { build_pull_requests: true }
	 * @returns {Promise<{pipeline: BuildkitePipeline, existed: boolean}>} The pipeline
	 */
	async createPipeline(org, { name, repository, clusterId, defaultBranch = 'main', settings }) {
		console.log(`🔄 Creating Buildkite pipeline: ${name} (${repository})`);

		const body = {
			name,
			repository,
			default_branch: defaultBranch,
			configuration: BuildkiteAPIService.configurationWrapper()
		};
		if (clusterId) {
			body.cluster_id = clusterId;
		}
		if (settings) {
			body.provider_settings = settings;
		}

		const { attempts, baseDelayMs, maxDelayMs, backoffFactor } = this.createRetry;
		let lastError;

		for (let attempt = 1; attempt <= attempts; attempt++) {
			try {
				const response = await this.makeRequest(`/organizations/${org}/pipelines`, {
					method: 'POST',
					body: JSON.stringify(body)
				});
				const pipeline = await response.json();
				console.log(`✅ Buildkite pipeline created: ${pipeline.slug}`);
				return { pipeline, existed: false };
			} catch (error) {
				lastError = error;

				// Idempotency: the name is taken. Look it up and carry on rather
				// than failing generation.
				if (this.#isAlreadyExistsError(error)) {
					console.log(`ℹ️ Buildkite pipeline "${name}" already exists — reusing it.`);
					const existing = await this.getPipeline(org, name);
					return { pipeline: existing, existed: true };
				}

				if (!this.#isRetryableCreateError(error) || attempt === attempts) {
					throw error;
				}

				const delay = Math.min(baseDelayMs * backoffFactor ** (attempt - 1), maxDelayMs);
				console.warn(
					`⏳ Buildkite repository not ready (attempt ${attempt}/${attempts}): ${error.message}. Retrying in ${delay}ms...`
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw lastError;
	}

	/**
	 * Registers the pipeline's GitHub webhook.
	 *
	 * This is the step that makes pushes actually build, and it is easy to miss:
	 * a pipeline created through the API has a `provider.webhook_url` but **no
	 * webhook behind it**, so pushes silently trigger nothing while every other
	 * signal (repository connection, `build_branches: true`) looks healthy.
	 * Buildkite exposes this as an endpoint that is not in the REST reference;
	 * it returns 201 and is safe to call repeatedly.
	 *
	 * @param {string} org - Organization slug
	 * @param {string} slug - Pipeline slug
	 * @returns {Promise<boolean>} Whether a webhook is now registered
	 */
	async registerWebhook(org, slug) {
		console.log(`🔄 Registering the GitHub webhook for ${slug}...`);
		try {
			await this.makeRequest(`/organizations/${org}/pipelines/${slug}/webhook`, {
				method: 'POST'
			});
			console.log(`✅ Webhook registered for ${slug}`);
			return true;
		} catch (error) {
			console.warn(`⚠️ Could not register the webhook for ${slug}: ${error.message}`);
			return false;
		}
	}

	/**
	 * Confirms whether the pipeline has a webhook, by checking that Buildkite
	 * exposes a `provider.webhook_url`. This is a necessary condition, not a
	 * sufficient one — the URL is present even before the webhook exists — so
	 * callers should treat a missing URL as a hard failure and a present one as
	 * "presumed registered" (registerWebhook is what actually creates it).
	 *
	 * @param {string} org - Organization slug
	 * @param {string} slug - Pipeline slug
	 * @returns {Promise<boolean>} Whether the pipeline advertises a webhook URL
	 */
	async hasWebhook(org, slug) {
		try {
			const pipeline = await this.getPipeline(org, slug);
			return Boolean(pipeline?.provider?.webhook_url);
		} catch (error) {
			console.warn(`⚠️ Could not check the webhook for ${slug}: ${error.message}`);
			return false;
		}
	}

	/**
	 * Sets the pipeline's configuration (the uploaded steps, or the wrapper).
	 * @param {string} org - Organization slug
	 * @param {string} slug - Pipeline slug
	 * @param {string} configuration - Pipeline YAML
	 * @returns {Promise<BuildkitePipeline>} Updated pipeline
	 */
	async setConfiguration(org, slug, configuration) {
		if (!configuration) {
			throw new Error(
				'Buildkite rejects an empty pipeline configuration (it produces a zero-step build).'
			);
		}
		const response = await this.makeRequest(`/organizations/${org}/pipelines/${slug}`, {
			method: 'PATCH',
			body: JSON.stringify({ configuration })
		});
		return response.json();
	}

	/**
	 * Triggers a build. Best-effort by design: a first build that cannot start
	 * must not fail generation, because the next push will run it anyway.
	 * @param {string} org - Organization slug
	 * @param {string} slug - Pipeline slug
	 * @param {Object} options - Build options
	 * @param {string} options.commit - Commit SHA
	 * @param {string} options.branch - Branch
	 * @param {string} [options.message] - Build message
	 * @returns {Promise<Object>} The created build
	 */
	async triggerBuild(org, slug, { commit, branch, message }) {
		const body = { commit, branch };
		if (message) {
			body.message = message;
		}
		const response = await this.makeRequest(`/organizations/${org}/pipelines/${slug}/builds`, {
			method: 'POST',
			body: JSON.stringify(body)
		});
		return response.json();
	}

	/**
	 * Validates the token by requesting its scopes.
	 * @returns {Promise<boolean>} Whether the token is usable
	 */
	async validateToken() {
		return super.validateToken(this.getAccessToken);
	}

	/**
	 * Detects the "pipeline name is taken" case, which is success for our
	 * purposes rather than an error.
	 * @param {Error} error - Error thrown by makeRequest
	 * @returns {boolean} Whether the name already exists
	 */
	#isAlreadyExistsError(error) {
		const message = error?.message || '';
		if (!/Buildkite API error: 422/.test(message)) {
			return false;
		}
		// Buildkite returns `{"message":"Validation Failed","errors":[{"field":"name",...}]}`
		return /name/i.test(message) && /(taken|already|exists|unique)/i.test(message);
	}

	/**
	 * Whether a creation error is worth retrying. The repository being invisible
	 * to the GitHub App for a few seconds after creation is the same race
	 * CircleCI has (and retries for). NOTE: unlike CircleCI's 404, Buildkite's
	 * exact error for an unindexed repo has not been observed here — 404s and
	 * 5xx/network failures are retried on the assumption that it surfaces as one
	 * of those; the retry is harmless if it never fires.
	 * @param {Error} error - Error thrown by makeRequest
	 * @returns {boolean} Whether the error is transient/retryable
	 */
	#isRetryableCreateError(error) {
		const message = error?.message || '';
		if (!message) {
			return false;
		}
		// A repository Buildkite cannot see yet, or a not-yet-populated response.
		if (/Buildkite API error: 404/.test(message)) {
			return true;
		}
		// Repository not found / not accessible via the GitHub App.
		if (/Buildkite API error: 422/.test(message) && /repositor/i.test(message)) {
			return true;
		}
		// Transient server/network failures (fetch rejects with a TypeError).
		return /Buildkite API error: 5\d\d/.test(message) || error instanceof TypeError;
	}
}
