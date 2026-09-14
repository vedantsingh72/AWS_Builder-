FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY services/api/package.json ./services/api/
RUN npm install --workspace=@ai-office/api --workspace=@ai-office/shared-types tsx
COPY shared ./shared
COPY services/api ./services/api
WORKDIR /app/services/api
EXPOSE 3001
CMD ["npm", "run", "dev"]
