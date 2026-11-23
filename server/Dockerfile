# Imagem do servidor do Tanquei.
#   docker build -t tanquei-server server/
#   docker run --env-file server/.env -p 3333:3333 tanquei-server
# Migrations (passo de release, antes de subir a versão nova):
#   docker run --env-file server/.env tanquei-server npm run migrate

FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:${PORT:-3333}/health >/dev/null || exit 1
CMD ["node", "dist/index.js"]
