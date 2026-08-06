FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: no dependency lifecycle script runs as root at build time.
RUN npm ci --omit=dev --ignore-scripts

COPY . .

USER node

EXPOSE 3001

CMD ["node", "server.js"]
