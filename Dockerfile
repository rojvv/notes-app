FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS migrate

WORKDIR /migrate/
COPY api/drizzle/ drizzle/
COPY api/drizzle.config.json drizzle.config.json
COPY api/schema.ts schema.ts
COPY api/migrate migrate
RUN ./migrate

FROM base AS app

WORKDIR /app/
COPY app/pnpm-lock.yaml .
COPY app/package.json .
RUN pnpm install --frozen-lockfile
COPY app/ .
RUN pnpm build

FROM denoland/deno

COPY --from=app /app/dist/ /app/

WORKDIR /api
COPY --from=migrate /migrate/drizzle/ drizzle/

COPY api/deno.jsonc .
COPY api/import_map.json .
COPY api/deps.ts .
RUN deno cache deps.ts

COPY api/ .
ENV APP_PATH=/app/

CMD ["task", "start"]
