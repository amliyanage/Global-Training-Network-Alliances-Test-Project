# ── Development stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app

COPY package*.json ./
RUN npm install

# Source is mounted as a volume at runtime (not baked in)
EXPOSE 6000
CMD ["npx", "nodemon", "--exec", "tsx", "src/server.ts"]

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 6000
CMD ["node", "dist/server.js"]