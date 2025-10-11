# Project Template Generator Examples

This document provides examples of how to use the Project Template Generator to create different types of projects.

## CLI Examples

### Basic SvelteKit Project with Cloudflare

```bash
# Interactive mode
npx project-template-generator create my-sveltekit-app

# Non-interactive mode
npx project-template-generator create my-sveltekit-app \
  --template webapp \
  --framework sveltekit \
  --cloud cloudflare \
  --no-interactive
```

### API Project with Express and AWS

```bash
npx project-template-generator create my-api \
  --template api \
  --framework express \
  --cloud aws \
  --no-interactive
```

### Library Project (No Cloud)

```bash
npx project-template-generator create my-library \
  --template library \
  --framework none \
  --cloud none \
  --no-interactive
```

## Web UI Examples

### Starting the Web UI

```bash
# Start the web server
npx project-template-generator serve

# Or with custom port
PORT=8080 npx project-template-generator serve
```

Then open http://localhost:3000 in your browser.

### Web UI Features

1. **Interactive Form**: Fill out the project configuration form
2. **GitHub Integration**: Optionally create GitHub repositories
3. **CircleCI Setup**: Automatically configure CI/CD pipelines
4. **Real-time Preview**: See configuration changes as you type

## Generated Project Examples

### SvelteKit + Cloudflare Project

```
my-sveltekit-app/
├── .devcontainer/
│   ├── devcontainer.json
│   ├── Dockerfile
│   ├── .zshrc
│   ├── .p10k.zsh
│   └── post-create-setup.sh
├── .circleci/
│   └── config.yml
├── .vscode/
│   ├── settings.json
│   ├── extensions.json
│   └── tasks.json
├── webapp/
│   ├── src/
│   │   ├── app.html
│   │   ├── app.css
│   │   └── routes/
│   │       ├── +layout.svelte
│   │       └── +page.svelte
│   ├── scripts/
│   │   ├── cloud-login.sh
│   │   └── setup-wrangler-config.sh
│   ├── wrangler.template.jsonc
│   ├── svelte.config.js
│   ├── vite.config.js
│   └── package.json
├── doppler.yaml
├── sonar-project.properties
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
└── README.md
```

### Express + AWS Project

```
my-api/
├── .devcontainer/
│   └── [devcontainer files]
├── .circleci/
│   └── config.yml
├── .vscode/
│   └── [vscode files]
├── src/
│   ├── index.js
│   ├── routes/
│   └── middleware/
├── tests/
│   └── [test files]
├── package.json
├── serverless.yml
└── README.md
```

## Configuration Examples

### Custom DevContainer Configuration

The generator creates a complete devcontainer setup with:

- Node.js 22 with Debian Bookworm
- zsh with Oh My Zsh and Powerlevel10k
- Doppler CLI for secrets management
- VS Code extensions for your chosen framework
- Forwarded ports for development

### CircleCI Pipeline Configuration

The generated CircleCI config includes:

- **Build Job**: Install dependencies, build project
- **Test Job**: Run unit tests with Jest/Vitest
- **Browser Test Job**: Run E2E tests with Playwright
- **Deploy Job**: Deploy to production (main branch)
- **Deploy Preview Job**: Deploy preview (other branches)

### Cloud Provider Integration

#### Cloudflare Workers
- Wrangler configuration
- D1 database setup
- KV namespace configuration
- Environment-specific deployments

#### Google Cloud Platform
- Cloud Run configuration
- Cloud SQL setup
- GCS bucket configuration
- IAM service accounts

#### Amazon Web Services
- Lambda function configuration
- RDS database setup
- S3 bucket configuration
- IAM roles and policies

## Advanced Usage

### Custom Templates

You can extend the generator by adding custom templates:

1. Create a new template directory in `templates/`
2. Add your custom files with Handlebars templating
3. Update the generator to include your templates

### Environment-Specific Configuration

The generator supports different configurations for different environments:

- **Development**: Local development with hot reload
- **Staging**: Preview deployments for testing
- **Production**: Production-ready deployments

### Integration with Existing Projects

You can also use the generator to add infrastructure to existing projects:

```bash
# Add devcontainer to existing project
npx project-template-generator add-devcontainer

# Add CircleCI pipeline
npx project-template-generator add-circleci

# Add Doppler integration
npx project-template-generator add-doppler
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure you have write permissions in the target directory
2. **Template Not Found**: Ensure all template files are present in the templates directory
3. **GitHub API Error**: Check your GitHub token has the correct permissions
4. **CircleCI Setup Failed**: Verify your CircleCI API token and project permissions

### Debug Mode

Run with debug logging:

```bash
DEBUG=project-template-generator npx project-template-generator create my-project
```

### Getting Help

- Check the [README.md](README.md) for basic usage
- Look at the [templates/](templates/) directory for configuration examples
- Open an issue on GitHub for bugs or feature requests