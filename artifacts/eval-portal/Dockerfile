# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib ./lib
COPY artifacts/eval-portal ./artifacts/eval-portal

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build frontend
ARG VITE_API_BASE_URL=http://localhost:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN cd artifacts/eval-portal && pnpm run build

# Runtime stage - serve with simple HTTP server
FROM node:18-alpine

RUN npm install -g serve

WORKDIR /app

# Copy built frontend
COPY --from=builder /app/artifacts/eval-portal/dist ./dist

# Expose port
EXPOSE 3000

# Serve frontend
CMD ["serve", "-s", "dist", "-l", "3000", "-c", "/etc/serve-config.json"]
