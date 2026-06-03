#Author: Amin Shahamiri
#Dockerfile for a Node.js API application
FROM node:24.15.0-alpine3.23

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --only=production

COPY . .

ENV APP_PORT=3000

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:${APP_PORT}/api/health || exit 1

CMD ["node", "server.js"]