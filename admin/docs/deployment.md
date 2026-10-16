# Setup and deployment (historical)

This document describes the earlier workspace deployment. Use the [current instructions](../../README.md) for the three standalone Android apps and their APIs.

## Local development

Run `npm run setup` once, then `npm run dev`. The root scripts handle PHP SQLite flags on this Windows installation. Individual services can be started with `npm run api`, `npm run customer:web`, `npm run supplier:web` and `npm run engine`.

Queue processing uses `php artisan queue:work --timeout=240 --tries=2` from admin. If PHP lacks enabled SQLite extensions, prepend `-d extension=pdo_sqlite -d extension=sqlite3` or enable them in your own php.ini.

## Docker Compose

Docker Desktop must be running. It was unavailable during implementation, so the containers have not been built or smoke-tested here.

1. Prepare admin/.env using its example and generate APP_KEY with `php artisan key:generate`.
2. Copy the root .env.example to .env and replace all password/token placeholders with random values.
3. Run `docker compose up -d --build`.
4. Run `docker compose exec app php artisan migrate --seed` for a local demo.
5. Start the mobile apps with npm, targeting http://localhost:8000/api/v1.

Compose includes PHP-FPM, Nginx, MySQL 8, Redis, the Laravel queue worker and an internal Python/Blender worker. MySQL, Redis and simulation ports are not exposed. Application storage and database data use named volumes.

The optional MinIO profile starts with `docker compose --profile storage up -d`. Create a bucket through its localhost:9001 console and use separate application credentials with only required object access.

## S3-compatible storage

Configure Laravel's standard values:

```dotenv
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=inficarx-assets
AWS_ENDPOINT=http://minio:9000
AWS_USE_PATH_STYLE_ENDPOINT=true
ASSET_DISK=s3
SIMULATION_DISK=s3
```

Use an endpoint hostname reachable by both API and clients for signed photo URLs, or configure separate public routing with a reverse proxy. Do not expose the worker. S3 photo URLs are short-lived signed URLs; simulation objects are streamed through approval-checked API/admin endpoints. Keep the bucket private. Customer request photos remain on Laravel's private local disk; back up the shared application-storage volume.

## Production preparation

- Set APP_ENV=production, APP_DEBUG=false, an HTTPS APP_URL and exact CORS origins. Configure secure session cookies.
- Create roles and the first administrator with `php artisan marketplace:admin admin@your-domain.example`; it asks for the password without putting it in shell history.
- Do not seed demo users in production. Import licensed catalog/fitment data and correct supplier contact details.
- Configure AI credentials and an account-accessible model; evaluate responses and privacy/retention settings before customer use.
- Supply licensed models and authoritative repair sources, then have qualified reviewers validate candidates.
- Build and sign native apps with your Apple/Google accounts. The included Expo EAS profiles are starting configurations, not uploaded builds.
- Resolve or formally assess dependency advisories recorded in verification.md. Test SDK upgrades as a complete native dependency set.
- Configure HTTPS termination, backups, queue monitoring, failed-job alerts, upload scanning, application logs and operational access.
- In-app notifications are implemented. OS push notifications/email/SMS delivery, password recovery/email verification and payment/order processing are not implemented in this version.
- Scale the worker as an internal service with isolation and memory/CPU limits. The included stdlib HTTP server is a small internal worker; do not expose it directly to the internet.

## CI

.github/workflows/ci.yml runs TypeScript, PHP and Python checks, builds viewer/admin assets, exports both web apps and runs browser tests. CI has been configured but has not been run on a remote repository in this session.
