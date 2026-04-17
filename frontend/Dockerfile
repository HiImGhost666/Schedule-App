# Stage 1: Dependencies
FROM node:22.12.0 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Test
FROM deps AS test
ENV CI=true
RUN npm test

# Stage 3: Runner
FROM node:22.12.0-alpine AS runner
WORKDIR /app
COPY --from=test /app/dist /app/dist
# Since we are in dev mode in this project (as per package.json scripts), 
# we usually want the source for live-reload. 
# But the USER requested Local CI/CD for a production-like flow.
# I'll keep it using the final runner as alpine.
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
