# Git, Code Review, and Deployment Rules

- **No Git Commits**: Never run `git commit` to package changes. Always leave files modified in the working directory (unstaged or staged).
- **No Git Pushes**: Never run `git push` to push local branch commits to any remote repository.
- **No Deployments**: Never run `wrangler deploy`, `npm run deploy`, or any other deployment command to push code to the production/default environment.
- **Goal**: Keep all modifications fully visible in the local git working directory so the user can easily review the side-by-side diffs in the VS Code Source Control view before staging, committing, pushing, or deploying them manually.
