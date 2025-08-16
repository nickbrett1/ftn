# Preview Deployments

This document explains how preview deployments work in this project and how to use them effectively.

## Overview

Preview deployments allow you to deploy and test changes from feature branches without affecting production. Each non-main branch gets its own unique preview URL where you can:

- View UI changes in a real browser
- Test functionality with real data
- Share working demos with stakeholders
- Iterate quickly with Cursor agents

## How It Works

### 1. Automatic Deployment
When you push to any branch other than `main`:
1. CircleCI builds and tests your code
2. If tests pass, it automatically deploys to a preview environment
3. You get a unique preview URL: `https://preview-{branch-name}.ftn.workers.dev`

### 2. Preview Environment Naming
- Branch: `feature/user-authentication`
- Preview URL: `https://preview-feature-user-authentication.ftn.workers.dev`
- Branch: `bugfix/login-bug`
- Preview URL: `https://preview-bugfix-login-bug.ftn.workers.dev`

### 3. Environment Isolation
- Preview deployments use the same database and storage as production
- This ensures realistic testing conditions
- **Important**: Be careful with data modifications in preview environments

## Benefits

### For Development
- **Immediate feedback**: See changes live without merging
- **UI testing**: Catch visual bugs that unit tests miss
- **Integration testing**: Test with real backend services
- **Stakeholder review**: Share working demos easily

### For Cursor Agents
- **Iterative development**: Deploy each change and see results
- **No branch deletion**: Keep working with the agent while testing
- **Rapid prototyping**: Test ideas quickly before committing

### For Quality Assurance
- **Real environment testing**: Test in conditions identical to production
- **Cross-browser testing**: Verify compatibility across different browsers
- **Performance testing**: Measure real-world performance impact

## Usage Examples

### 1. Feature Development
```bash
# Create a feature branch
git checkout -b feature/new-dashboard

# Make changes and push
git add .
git commit -m "Add new dashboard widget"
git push origin feature/new-dashboard

# CircleCI automatically deploys to:
# https://preview-feature-new-dashboard.ftn.workers.dev
```

### 2. Bug Fixes
```bash
# Create a bugfix branch
git checkout -b bugfix/login-validation

# Fix the issue and push
git add .
git commit -m "Fix login validation logic"
git push origin bugfix/login-validation

# Test at:
# https://preview-bugfix-login-validation.ftn.workers.dev
```

### 3. Cursor Agent Iteration
```bash
# Work with Cursor agent on a branch
git checkout -b agent/improve-ui

# Agent makes changes, you can:
# 1. Push and see results immediately
git push origin agent/improve-ui

# 2. Test at preview URL
# 3. Give feedback to agent
# 4. Agent makes more changes
# 5. Repeat until satisfied
# 6. Merge when ready
```

## Configuration

### Wrangler Configuration
The preview environment is configured in `wrangler.template.jsonc`:
```json
"env": {
  "preview": {
    "main": ".svelte-kit/cloudflare/_worker.js",
    "assets": {
      "binding": "ASSETS",
      "directory": ".svelte-kit/cloudflare"
    }
    // ... other configurations
  }
}
```

### CircleCI Pipeline
Preview deployments are triggered automatically for non-main branches:
```yaml
- deploy-preview:
    requires:
      - browser_test
      - code_test
    filters:
      branches:
        ignore: main
```

## Best Practices

### 1. Branch Naming
- Use descriptive branch names: `feature/user-profile`, `bugfix/payment-error`
- Avoid special characters that might cause URL issues
- Keep names concise but clear

### 2. Testing
- Always test your preview deployment before sharing
- Verify both functionality and visual appearance
- Test on different devices/browsers if possible

### 3. Data Safety
- Preview environments use production data
- Be careful with destructive operations
- Consider using test data for risky operations

### 4. Cleanup
- Delete feature branches after merging
- Preview URLs are automatically cleaned up when branches are deleted
- Keep your repository organized

## Troubleshooting

### Preview Not Deploying
1. Check CircleCI pipeline status
2. Ensure tests are passing
3. Verify branch name doesn't contain invalid characters
4. Check wrangler configuration

### Preview URL Not Working
1. Wait a few minutes for deployment to complete
2. Check CircleCI logs for deployment errors
3. Verify the preview environment was created
4. Check Cloudflare Workers dashboard

### Environment Issues
1. Ensure Doppler secrets are properly configured
2. Check that all required environment variables are set
3. Verify database and storage access permissions

## Monitoring

### CircleCI
- Monitor deployment status in the CircleCI dashboard
- Check logs for any deployment errors
- Verify all required jobs complete successfully

### Cloudflare
- View preview environments in the Cloudflare Workers dashboard
- Monitor performance and error rates
- Check logs for any runtime issues

## Security Considerations

- Preview environments use the same secrets as production
- Be careful with sensitive data in preview URLs
- Consider implementing access controls for preview environments
- Monitor for any unauthorized access attempts

## Cost Implications

- Each preview environment incurs Cloudflare Workers costs
- Costs are typically minimal for development workloads
- Consider implementing automatic cleanup for old preview environments
- Monitor usage to avoid unexpected charges

## Future Enhancements

Potential improvements to consider:
1. **Automatic cleanup**: Remove preview environments after branch deletion
2. **Access controls**: Implement authentication for preview environments
3. **Performance monitoring**: Add performance tracking for preview deployments
4. **Integration testing**: Automate testing across multiple preview environments
5. **Staging environment**: Add a dedicated staging environment for pre-production testing