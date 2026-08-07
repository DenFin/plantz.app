# plantz.app

## About the project

Plantz is a personal project that helps me to overview all my houseplants, track their progress and get reminded to take care of them.

In it's current form, it is only designed for helping me and running in my homelab, which means there is no authentication flow implemented. In the near future, I want to add an authentication system and deploy it to a publicly available server.

### Built With

[![Nuxt](https://img.shields.io/badge/Nuxt-002E3B?logo=nuxt&logoColor=#00DC82)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white)](#)
[![Postgres](https://img.shields.io/badge/Postgres-%23316192.svg?logo=postgresql&logoColor=white)](#)
[![MinIO](https://img.shields.io/badge/MinIO-C72E49?logo=minio&logoColor=fff)](#)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)](#)
[![nginx](https://img.shields.io/badge/nginx-009639?logo=nginx&logoColor=fff)](#)

### Features
- Create plants
- Take photos of plants
- Add notes to plants

## Notes

### Database migrations

Migrations run automatically at server startup. The runner reads `server/db/migrations/`,
skips every file already recorded in the `schema_migrations` table, and applies the rest in
order, one transaction per file. A failing file logs its name and stops the process, so the
app never serves traffic on a half-migrated schema.

To add a migration, drop a new `.sql` file into `server/db/migrations/` and restart the
app. Files are applied in filename order, with `initial.sql` first.

On a database that was migrated by hand before this runner existed, the first start adopts
the current files instead of executing them: it records them as applied and changes
nothing. The marker for "already migrated" is the `plants.parent_plant_id` column.

### Deployment

```bash
docker build -t plantz-app .
docker run --rm -it -p 3000:3000 --env-file .env --name plantz-app plantz-app
```
