/**
 * @fileoverview E2E test for unauthenticated capability viewing
 * @description Tests the complete user flow for viewing capabilities without authentication
 */

import { test, expect } from '@playwright/test';

test.describe('Genproj Capability Browsing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the genproj page
    await page.goto('/projects/genproj');
  });

  test('should display capabilities without authentication', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that capabilities are displayed
    await expect(page.locator('[data-testid="capability-list"]')).toBeVisible();
    
    // Check that individual capability cards are present
    const capabilityCards = page.locator('[data-testid="capability-card"]');
    await expect(capabilityCards).toHaveCountGreaterThan(0);
    
    // Check that each capability card has required elements
    const firstCard = capabilityCards.first();
    await expect(firstCard.locator('[data-testid="capability-name"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="capability-description"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="capability-category"]')).toBeVisible();
  });

  test('should display capability categories', async ({ page }) => {
    // Check that category sections are present
    const categories = ['devcontainer', 'ci-cd', 'code-quality', 'secrets', 'deployment', 'monitoring'];
    
    for (const category of categories) {
      const categorySection = page.locator(`[data-testid="category-${category}"]`);
      await expect(categorySection).toBeVisible();
    }
  });

  test('should show capability details on hover', async ({ page }) => {
    const capabilityCard = page.locator('[data-testid="capability-card"]').first();
    
    // Hover over the capability card
    await capabilityCard.hover();
    
    // Check that additional details are shown
    await expect(capabilityCard.locator('[data-testid="capability-details"]')).toBeVisible();
  });

  test('should display login prompt when generation attempted', async ({ page }) => {
    // Try to click generate button (should be disabled or show login prompt)
    const generateButton = page.locator('[data-testid="generate-button"]');
    
    if (await generateButton.isEnabled()) {
      await generateButton.click();
      
      // Should show login modal or redirect to login
      await expect(page.locator('[data-testid="login-modal"]')).toBeVisible();
    } else {
      // Button should be disabled for unauthenticated users
      await expect(generateButton).toBeDisabled();
    }
  });

  test('should show capability selection interface', async ({ page }) => {
    // Check that capability selection interface is present
    await expect(page.locator('[data-testid="capability-selector"]')).toBeVisible();
    
    // Check that capability checkboxes are present
    const capabilityCheckboxes = page.locator('[data-testid="capability-checkbox"]');
    await expect(capabilityCheckboxes).toHaveCountGreaterThan(0);
  });

  test('should display capability dependencies and conflicts', async ({ page }) => {
    // Select a capability that has dependencies
    const sonarlintCheckbox = page.locator('[data-testid="capability-checkbox"][data-capability-id="sonarlint"]');
    await sonarlintCheckbox.check();
    
    // Should show dependency warning
    await expect(page.locator('[data-testid="dependency-warning"]')).toBeVisible();
    
    // Should suggest adding the dependency
    const addDependencyButton = page.locator('[data-testid="add-dependency-button"]');
    await expect(addDependencyButton).toBeVisible();
  });

  test('should show capability conflicts', async ({ page }) => {
    // Select conflicting capabilities
    const circleciCheckbox = page.locator('[data-testid="capability-checkbox"][data-capability-id="circleci"]');
    const githubActionsCheckbox = page.locator('[data-testid="capability-checkbox"][data-capability-id="github-actions"]');
    
    await circleciCheckbox.check();
    await githubActionsCheckbox.check();
    
    // Should show conflict warning
    await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible();
    
    // Should suggest resolving the conflict
    const resolveConflictButton = page.locator('[data-testid="resolve-conflict-button"]');
    await expect(resolveConflictButton).toBeVisible();
  });

  test('should display authentication requirements', async ({ page }) => {
    // Select capabilities that require authentication
    const circleciCheckbox = page.locator('[data-testid="capability-checkbox"][data-capability-id="circleci"]');
    await circleciCheckbox.check();
    
    // Should show authentication requirements
    await expect(page.locator('[data-testid="auth-requirements"]')).toBeVisible();
    
    // Should list required services
    await expect(page.locator('[data-testid="auth-service-circleci"]')).toBeVisible();
  });

  test('should show capability configuration options', async ({ page }) => {
    // Select a capability with configuration options
    const nodeCheckbox = page.locator('[data-testid="capability-checkbox"][data-capability-id="devcontainer-node"]');
    await nodeCheckbox.check();
    
    // Should show configuration form
    await expect(page.locator('[data-testid="capability-config"]')).toBeVisible();
    
    // Should show configuration options
    await expect(page.locator('[data-testid="config-node-version"]')).toBeVisible();
    await expect(page.locator('[data-testid="config-package-manager"]')).toBeVisible();
  });

  test('should display project name input', async ({ page }) => {
    // Check that project name input is present
    await expect(page.locator('[data-testid="project-name-input"]')).toBeVisible();
    
    // Should have placeholder text
    const projectNameInput = page.locator('[data-testid="project-name-input"]');
    await expect(projectNameInput).toHaveAttribute('placeholder');
  });

  test('should validate project name input', async ({ page }) => {
    const projectNameInput = page.locator('[data-testid="project-name-input"]');
    
    // Try invalid project name
    await projectNameInput.fill('a'); // Too short
    
    // Should show validation error
    await expect(page.locator('[data-testid="project-name-error"]')).toBeVisible();
    
    // Try valid project name
    await projectNameInput.fill('my-awesome-project');
    
    // Should clear validation error
    await expect(page.locator('[data-testid="project-name-error"]')).not.toBeVisible();
  });

  test('should display repository URL input', async ({ page }) => {
    // Check that repository URL input is present
    await expect(page.locator('[data-testid="repository-url-input"]')).toBeVisible();
    
    // Should be optional
    const repositoryUrlInput = page.locator('[data-testid="repository-url-input"]');
    await expect(repositoryUrlInput).toHaveAttribute('placeholder');
  });

  test('should validate repository URL input', async ({ page }) => {
    const repositoryUrlInput = page.locator('[data-testid="repository-url-input"]');
    
    // Try invalid URL
    await repositoryUrlInput.fill('not-a-github-url');
    
    // Should show validation error
    await expect(page.locator('[data-testid="repository-url-error"]')).toBeVisible();
    
    // Try valid GitHub URL
    await repositoryUrlInput.fill('https://github.com/user/repo');
    
    // Should clear validation error
    await expect(page.locator('[data-testid="repository-url-error"]')).not.toBeVisible();
  });

  test('should show preview tab', async ({ page }) => {
    // Check that preview tab is present
    await expect(page.locator('[data-testid="preview-tab"]')).toBeVisible();
    
    // Should be clickable
    const previewTab = page.locator('[data-testid="preview-tab"]');
    await previewTab.click();
    
    // Should show preview content
    await expect(page.locator('[data-testid="preview-content"]')).toBeVisible();
  });

  test('should switch between capabilities and preview tabs', async ({ page }) => {
    const capabilitiesTab = page.locator('[data-testid="capabilities-tab"]');
    const previewTab = page.locator('[data-testid="preview-tab"]');
    
    // Start on capabilities tab
    await expect(capabilitiesTab).toHaveClass(/active/);
    await expect(page.locator('[data-testid="capability-selector"]')).toBeVisible();
    
    // Switch to preview tab
    await previewTab.click();
    await expect(previewTab).toHaveClass(/active/);
    await expect(page.locator('[data-testid="preview-content"]')).toBeVisible();
    
    // Switch back to capabilities tab
    await capabilitiesTab.click();
    await expect(capabilitiesTab).toHaveClass(/active/);
    await expect(page.locator('[data-testid="capability-selector"]')).toBeVisible();
  });

  test('should show login button for unauthenticated users', async ({ page }) => {
    // Check that login button is present
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Should have appropriate text
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toContainText('Sign in');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that capabilities are still visible
    await expect(page.locator('[data-testid="capability-list"]')).toBeVisible();
    
    // Check that tabs are still functional
    const previewTab = page.locator('[data-testid="preview-tab"]');
    await previewTab.click();
    await expect(page.locator('[data-testid="preview-content"]')).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    // Check for proper heading structure
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for proper form labels
    const projectNameInput = page.locator('[data-testid="project-name-input"]');
    await expect(projectNameInput).toHaveAttribute('aria-label');
    
    // Check for proper button labels
    const generateButton = page.locator('[data-testid="generate-button"]');
    await expect(generateButton).toHaveAttribute('aria-label');
    
    // Check for proper tab navigation
    const capabilitiesTab = page.locator('[data-testid="capabilities-tab"]');
    await expect(capabilitiesTab).toHaveAttribute('role', 'tab');
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/capabilities', route => route.abort());
    
    // Reload page
    await page.reload();
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});
