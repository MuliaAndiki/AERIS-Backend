FROM oven/bun:1.1.45 AS build

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

RUN bunx prisma generate

EXPOSE 5000

CMD ["bun", "run", "src/serve.ts"]
