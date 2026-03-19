FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm run reload
EXPOSE 3000
CMD ["pnpm", "start"]