# plantz.app

Plantz is a personal project that helps me to overview all my houseplants, track their progress and get reminded to take care of them.

## Database migrations

```bash
psql -h 192.168.2.177 -U admin -d plantz -f server/db/migrations/<FILE_NAME>.sql
```

## Deployment

### Docker
```bash
docker build -t plantz-app .
docker run --rm -it -p 3000:3000 --env-file .env --name plantz-app plantz-app
```

