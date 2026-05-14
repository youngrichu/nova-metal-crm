# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

RUN apk add --no-cache python3 make g++ linux-headers eudev-dev

WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install

COPY . .
ENV BETTER_AUTH_SECRET="placeholder_secret_for_build_only" \
    BETTER_AUTH_URL="http://localhost:3000"
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .

EXPOSE 3000
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
CMD ["node", "build"]
