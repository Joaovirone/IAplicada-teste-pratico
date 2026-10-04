FROM oven/bun:1.3 AS build

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

# Vite embeds these public Supabase values in the browser bundle at build time.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_CATALOG_SUPABASE_URL
ARG VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY

# The Lovable config defaults to Cloudflare; Docker needs Nitro's Node server.
RUN NITRO_PRESET=node-server bun run build

FROM node:22-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
