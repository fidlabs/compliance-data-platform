FROM node:20-alpine AS builder
USER node
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY --chown=1000:1000 . .
RUN --mount=type=secret,id=DATABASE_URL,uid=1000 \
    env DATABASE_URL=$(cat /run/secrets/DATABASE_URL) \
    npx prisma generate --sql --schema=./prisma/schema.prisma

RUN --mount=type=secret,id=DMOB_DATABASE_URL,uid=1000 \
    env DMOB_DATABASE_URL=$(cat /run/secrets/DMOB_DATABASE_URL) \
    npx prisma generate --sql --schema=./prismaDmob/schema.prisma

RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
USER node
WORKDIR /app
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /app/dist/ ./dist/
COPY --from=builder --chown=node:node /app/prisma/ ./prisma/
COPY --from=builder --chown=node:node /app/prismaDmob/ ./prismaDmob/
COPY ci/aws-secret-to-db-url.js ./
COPY ci/runner.sh ./
ADD --chown=node https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/certs/aws-global-bundle.pem
ENTRYPOINT [ "/app/runner.sh" ]
CMD [ "node", "dist/main.js" ]
