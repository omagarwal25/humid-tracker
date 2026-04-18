# humid-backend

Node.js/Express backend for the humidity monitoring system.

## Railway deployment

Set the `DATABASE_URL` environment variable in your Railway project to point at a PostgreSQL database.

Before the server starts for the first time, run `npm run build` to apply Prisma migrations (`prisma migrate deploy`). Railway can be configured to run this as a build command automatically.

## Local development

```
npm install
DATABASE_URL=postgresql://... npm run dev
```
