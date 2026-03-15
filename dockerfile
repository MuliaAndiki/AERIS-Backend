FROM oven/bun:1.1-slim

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

RUN bun install
RUN bun prisma generate

COPY . .

EXPOSE 3001


CMD ["bun", "run", "start"]