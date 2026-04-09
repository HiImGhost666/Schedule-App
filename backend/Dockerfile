# Dockerfile for backend
FROM node:22.12.0-slim
WORKDIR /app

# Instala openssl para Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY . .
# Genera Prisma Client
RUN npx prisma generate
# Expone el puerto
EXPOSE 3001
CMD ["npm", "run", "dev"]
