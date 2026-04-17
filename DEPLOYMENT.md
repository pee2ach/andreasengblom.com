# Deployment via GitHub Actions

## 1) Build lokalt (valfritt)

```bash
npm run build
```

Detta skapar `dist/` med helt statiska filer:
- inga runtime-fetches av `portfolio.json` eller `articles.json`
- en sida per tatuering: `/tattoo/<id>/`
- en sida per artikel: `/artiklar/<slug>/`

## 2) GitHub Secrets (repo -> Settings -> Secrets and variables -> Actions)

Lagg till:
- `DEPLOY_HOST` (t.ex. `example.com`)
- `DEPLOY_USER` (SSH-anvandare)
- `DEPLOY_PORT` (vanligtvis `22`)
- `DEPLOY_PATH` (t.ex. `/var/www/andreasengblom.com`)
- `DEPLOY_SSH_KEY` (privat nyckel som har access till servern)

## 3) Deploy

Workflow: `.github/workflows/deploy.yml`
Kors automatiskt vid push till `main` och kan aven startas manuellt via `workflow_dispatch`.
