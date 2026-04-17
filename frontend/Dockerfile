# Stage 1: Dependencies
FROM node:22.12.0-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Test
FROM deps AS test
RUN npm test

# Stage 3: Runner
FROM test AS runner
WORKDIR /app
EXPOSE 5173
CMD ["npm", "run", "dev"]
