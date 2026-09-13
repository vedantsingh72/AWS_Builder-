FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY services/ai/package.json ./services/ai/
RUN npm install --workspace=@ai-office/ai --workspace=@ai-office/shared-types
COPY shared ./shared
COPY services/ai ./services/ai
WORKDIR /app/services/ai
EXPOSE 3002
CMD ["npm", "run", "dev"]
