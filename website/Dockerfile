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
COPY --from=build --chown=node:node /site/src/bump/seo ./src/bump/seo
COPY --from=build --chown=node:node /site/src/bump/ui/musicController.js ./src/bump/ui/musicController.js
COPY --from=build --chown=node:node /site/src/bump/content.json ./src/bump/content.json
COPY --from=build --chown=node:node /site/src/bump/contact.js ./src/bump/contact.js
COPY --from=build --chown=node:node /site/src/bump/locales ./src/bump/locales
USER node
EXPOSE 3000
CMD ["node", "scripts/serve-production.mjs"]
