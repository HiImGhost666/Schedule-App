# Stage 1: Dependencies
FROM node:22.12.0-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate

# Stage 2: Test
FROM deps AS test
ENV CI=true
RUN npm test -- --ci --runInBand

# Stage 3: Runner
FROM test AS runner
WORKDIR /app
EXPOSE 3001
CMD ["npm", "run", "dev"]
