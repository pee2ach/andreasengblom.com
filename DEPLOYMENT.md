# Deployment via GitHub Actions (FTP)

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
- `FTP_SERVER` (t.ex. `ftpcluster.loopia.se`)
- `FTP_USERNAME` (ditt FTP-anvandarnamn)
- `FTP_PASSWORD` (ditt FTP-losenord)
- `FTP_PORT` (valfritt, standard `21`)
- `FTP_SERVER_DIR` (malmapp pa servern, t.ex. `/` eller `/public_html/`)

## 3) Deploy

Workflow: `.github/workflows/deploy.yml`
Kors automatiskt vid push till `main` och kan aven startas manuellt via `workflow_dispatch`.
