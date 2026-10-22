FROM node:24.22.1-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.7 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm --filter @bump/api deploy --legacy --prod /out/api \
    && pnpm --filter @bump/worker deploy --legacy --prod /out/worker

FROM node:24.22.1-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/api/ ./
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]

FROM node:24.22.1-bookworm-slim AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/worker/ ./
USER node
EXPOSE 3002
CMD ["node", "dist/index.js"]

FROM node:24.22.1-bookworm-slim AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone/ ./
COPY --from=build --chown=node:node /app/apps/web/.next/static/ ./apps/web/.next/static/
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
