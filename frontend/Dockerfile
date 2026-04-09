# Dockerfile for frontend
FROM node:22.12.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
