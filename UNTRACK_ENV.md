# Untrack `backend/.env` and secure MongoDB credentials

If you accidentally committed `backend/.env` (contains MONGO_URI), follow these steps.

1) On a machine with git installed, run the helper script (recommended):

```powershell
# run from repository root
cd C:\WorkConnect\WorkConnect\backend\scripts
powershell -ExecutionPolicy Bypass -File .\untrack_env.ps1
```

This script will:
- ensure `backend/.env` is in `.gitignore` (adds it if missing)
- run `git rm --cached backend/.env`
- commit the change and push

2) Rotate Atlas credentials (if `backend/.env` was ever pushed):
- Login to MongoDB Atlas → Project → Database Access
- Edit the user (e.g., `workconnect-app`) and set a new password
- Update your local `backend/.env` with the new password
- For production deployments, update secrets in your CI/CD secrets store (GitHub Actions/GitLab/Azure Key Vault etc.)

3) If the secret was pushed to a public repository and you need to remove it from history, use one of these tools (BE CAREFUL — history rewrite required):
- git-filter-repo (recommended): https://github.com/newren/git-filter-repo
- BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/

Example (BFG) quick steps:

```bash
# locally (make a backup clone first!)
git clone --mirror git@github.com:your/repo.git repo-mirror.git
cd repo-mirror.git
# remove the file from history
bfg --delete-files backend/.env
# push rewritten history
git push --force
```

After history rewrite, all collaborators must re-clone the repository.

4) Secure future access:
- Use CI/CD secrets (GitHub Actions Secrets, GitLab CI/CD variables)
- Use a dedicated secret manager for production (Vault, Azure Key Vault, AWS Secrets Manager)
- Limit Atlas network access to specific IPs or VPCs

If you want, I can:
- Add `npm` scripts to start dev/no-db modes
- Run through the history-scrub commands tailored to your repo (I will provide exact commands)
- Help rotate Atlas credentials and update deployment secrets (I will draft the steps for you to run)
