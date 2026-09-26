# 1) сборка админ-панели
FROM node:22-alpine AS admin
WORKDIR /app/admin
COPY admin/package*.json ./
RUN npm install
COPY admin/ ./
RUN npm run build

# 2) сервер + статика админки
FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev --omit=optional
COPY server/ ./
COPY --from=admin /app/admin/dist /app/admin/dist
ENV PORT=3000 UPLOAD_DIR=/app/server/uploads
EXPOSE 3000
CMD ["node", "src/index.js"]
