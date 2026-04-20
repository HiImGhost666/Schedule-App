# Stage 1: Build and Test
FROM node:22.12.0-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Run tests - if they fail, the build stops
ENV CI=true
RUN npm run test -- --maxWorkers=1 --testTimeout=15000

# Stage 2: Runtime - inherit from builder to keep all dependencies
FROM builder AS runner

WORKDIR /app

# Expose Vite dev server port
EXPOSE 5173

# Run dev server with hot reload
CMD ["npm", "run", "dev"]
