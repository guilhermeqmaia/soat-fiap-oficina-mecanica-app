FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Executa como usuario nao-root (OWASP A05 - Security Misconfiguration)
RUN chown -R node:node /app
USER node

EXPOSE 3000

# `exec` faz o node virar PID 1 e receber SIGTERM (graceful shutdown em rolling deploys)
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main.js"]
