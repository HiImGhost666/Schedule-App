# Dockerfile for backend
FROM node:22.12.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Genera Prisma Client
RUN npx prisma generate
# Expone el puerto
EXPOSE 3001
CMD ["npm", "run", "dev"]
