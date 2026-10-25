FROM node:24-alpine AS build
WORKDIR /site
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
ARG SITE_PUBLIC_ORIGIN=""
RUN SITE_PUBLIC_ORIGIN="$SITE_PUBLIC_ORIGIN" npm run build

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /site
COPY --from=build --chown=node:node /site/dist/client ./dist/client
COPY --from=build --chown=node:node /site/scripts/serve-production.mjs ./scripts/serve-production.mjs
USER node
EXPOSE 3000
CMD ["node", "scripts/serve-production.mjs"]
