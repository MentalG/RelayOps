FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages ./packages

RUN bun install

EXPOSE 5000