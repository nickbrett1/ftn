# Git, Code Review, and Deployment Rules

- **Commit Changes**: You may run `git commit` to package your work. Use clear, descriptive commit messages and keep commits atomic (logical groups of related changes).
- **Push Changes**: You may run `git push` to push commits to the remote. Follow the repository's branch workflow (a `fix/`/`feature/` branch + PR, or pushing directly where that is the convention).
- **Checks are your safety net**: This repo runs CI/code checks, so prefer to run the relevant local checks/tests before pushing; CI validates the rest.
- **No Deployments**: Never run `wrangler deploy`, `npm run deploy`, or any other deployment command to push code to the production/default environment.
