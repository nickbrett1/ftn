# Project Template Generator Usage Guide

## Installation

### Global Installation

```bash
npm install -g project-template-generator
```

### Local Usage (Recommended)

```bash
npx project-template-generator create my-project
```

## CLI Usage

### Basic Commands

```bash
# Create a new project (interactive mode)
npx project-template-generator create <project-name>

# Create with specific options (non-interactive)
npx project-template-generator create <project-name> [options]

# Start web UI
npx project-template-generator serve

# Show help
npx project-template-generator --help
```

### Command Options

| Option | Short | Description | Choices |
|--------|-------|-------------|---------|
| `--template` | `-t` | Project template type | `api`, `webapp`, `library`, `fullstack` |
| `--framework` | `-f` | Framework to use | `sveltekit`, `nextjs`, `express`, `fastify`, `none` |
| `--cloud` | `-c` | Cloud provider | `cloudflare`, `gcs`, `aws`, `none` |
| `--output` | `-o` | Output directory | Any valid path |
| `--interactive` | `-i` | Run in interactive mode | `true`, `false` |
| `--yes` | `-y` | Skip confirmation prompts | `true`, `false` |

### Examples

#### Interactive Mode

```bash
npx project-template-generator create my-app
```

This will prompt you for:
- Project type (webapp, api, library, fullstack)
- Framework (SvelteKit, Next.js, Express, Fastify, none)
- Cloud provider (Cloudflare, GCS, AWS, none)
- Database (D1, PostgreSQL, MySQL, MongoDB, none)
- Testing framework (Jest+Playwright, Vitest+Playwright, etc.)
- SonarCloud integration
- Doppler integration
- Project description and author

#### Non-Interactive Mode

```bash
npx project-template-generator create my-sveltekit-app \
  --template webapp \
  --framework sveltekit \
  --cloud cloudflare \
  --no-interactive
```

#### Custom Output Directory

```bash
npx project-template-generator create my-project \
  --output /path/to/projects
```

## Web UI Usage

### Starting the Web Server

```bash
npx project-template-generator serve
```

The web UI will be available at http://localhost:3000

### Web UI Features

1. **Project Configuration Form**
   - Fill out project details
   - Select framework and cloud provider
   - Configure testing and quality tools

2. **GitHub Integration**
   - Create GitHub repositories
   - Set up webhooks
   - Configure branch protection

3. **CircleCI Integration**
   - Set up CI/CD pipelines
   - Configure environment variables
   - Set up deployment contexts

4. **Real-time Preview**
   - See configuration changes as you type
   - Preview generated project structure

### Custom Port

```bash
PORT=8080 npx project-template-generator serve
```

## Generated Project Structure

### SvelteKit Project

```
my-project/
├── .devcontainer/          # DevContainer configuration
│   ├── devcontainer.json
│   ├── Dockerfile
│   ├── .zshrc
│   ├── .p10k.zsh
│   └── post-create-setup.sh
├── .circleci/              # CI/CD pipeline
│   └── config.yml
├── .vscode/                # VS Code settings
│   ├── settings.json
│   ├── extensions.json
│   └── tasks.json
├── webapp/                 # SvelteKit application
│   ├── src/
│   │   ├── app.html
│   │   ├── app.css
│   │   └── routes/
│   ├── scripts/
│   │   ├── cloud-login.sh
│   │   └── setup-wrangler-config.sh
│   ├── wrangler.template.jsonc
│   ├── svelte.config.js
│   ├── vite.config.js
│   └── package.json
├── doppler.yaml            # Doppler configuration
├── sonar-project.properties # SonarCloud configuration
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
└── README.md
```

### API Project

```
my-api/
├── .devcontainer/          # DevContainer configuration
├── .circleci/              # CI/CD pipeline
├── .vscode/                # VS Code settings
├── src/                    # Source code
│   ├── index.js
│   ├── routes/
│   └── middleware/
├── tests/                  # Test files
├── package.json
└── README.md
```

## Configuration Files

### DevContainer Configuration

The generator creates a complete development environment with:

- **Base Image**: Node.js 22 on Debian Bookworm
- **Shell**: zsh with Oh My Zsh and Powerlevel10k
- **Tools**: Doppler CLI, Playwright, Sentry CLI
- **Extensions**: Framework-specific VS Code extensions
- **Ports**: Forwarded ports for development

### CircleCI Configuration

The CI/CD pipeline includes:

- **Build Job**: Install dependencies and build project
- **Test Job**: Run unit tests with coverage
- **Browser Test Job**: Run E2E tests with Playwright
- **Deploy Job**: Deploy to production (main branch)
- **Deploy Preview Job**: Deploy preview (other branches)

### Cloud Provider Configuration

#### Cloudflare Workers
- Wrangler configuration with environment variables
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

## Environment Setup

### Prerequisites

- Node.js 18 or higher
- Docker (for devcontainer)
- Git

### Optional Tools

- Doppler CLI (for secrets management)
- Wrangler CLI (for Cloudflare)
- Google Cloud CLI (for GCS)
- AWS CLI (for AWS)

### Development Workflow

1. **Generate Project**
   ```bash
   npx project-template-generator create my-project
   ```

2. **Open in DevContainer**
   ```bash
   code my-project  # or cursor my-project
   ```

3. **Set up Secrets**
   ```bash
   doppler login
   doppler setup --project my-project --config dev
   ```

4. **Set up Cloud Provider**
   ```bash
   # For Cloudflare
   npx wrangler login
   
   # For Google Cloud
   gcloud auth login
   
   # For AWS
   aws configure
   ```

5. **Install Dependencies**
   ```bash
   npm install
   ```

6. **Start Development**
   ```bash
   npm run dev
   ```

## Customization

### Custom Templates

You can extend the generator by adding custom templates:

1. Create a new directory in `templates/`
2. Add your template files with Handlebars syntax
3. Update the generator to include your templates

### Custom Configuration

The generator uses Handlebars templating for all configuration files. You can customize:

- Project structure
- Package.json scripts
- CircleCI pipeline steps
- DevContainer configuration
- VS Code settings

### Environment Variables

The generator supports environment variables for customization:

- `PROJECT_TEMPLATE_GENERATOR_PORT`: Web UI port (default: 3000)
- `PROJECT_TEMPLATE_GENERATOR_TEMPLATES_DIR`: Custom templates directory
- `PROJECT_TEMPLATE_GENERATOR_OUTPUT_DIR`: Default output directory

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure you have write permissions in the target directory
   - Check if the directory already exists and is not empty

2. **Template Not Found**
   - Verify all template files are present
   - Check the templates directory structure

3. **GitHub API Error**
   - Verify your GitHub token has the correct permissions
   - Check if the repository name is available

4. **CircleCI Setup Failed**
   - Verify your CircleCI API token
   - Check project permissions

### Debug Mode

Enable debug logging:

```bash
DEBUG=project-template-generator npx project-template-generator create my-project
```

### Getting Help

- Check the [README.md](README.md) for basic usage
- Look at the [EXAMPLES.md](EXAMPLES.md) for usage examples
- Open an issue on GitHub for bugs or feature requests