ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS builder
WORKDIR /workspace
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./
RUN npm ci
COPY apps ./apps
COPY libs ./libs
ARG APP=producer
RUN npx nest build ${APP}

FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
ARG APP=producer
ENV APP_NAME=${APP}
COPY --from=builder /workspace/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "node dist/apps/${APP_NAME}/apps/${APP_NAME}/src/main.js"]
