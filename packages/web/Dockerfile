FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/backend/package.json packages/backend/
COPY packages/backoffice/package.json packages/backoffice/
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/
COPY packages/workers/package.json packages/workers/
COPY packages/desktop/package.json packages/desktop/
COPY packages/ingest/package.json packages/ingest/

RUN bun install

COPY . .

EXPOSE 4321

CMD ["bun", "run", "--filter", "@hackflix/web", "dev", "--host", "0.0.0.0"]
