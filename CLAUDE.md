@AGENTS.md

# Deployment workflow

Vercel is deployed via the CLI (`vercel --prod`), NOT via GitHub auto-deploy. Pushing to git alone does NOT update production.

**After completing any feature or fix, always:**
1. Stage all changed/new files with `git add`
2. Commit with a descriptive message
3. `git push`
4. `vercel --prod` to deploy to production

Do all four steps at the end of every coding session without waiting to be asked. If multiple features were built in a session, a single bundled commit is fine.
