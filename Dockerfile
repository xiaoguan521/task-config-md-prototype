FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=18080

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY README.md ./
COPY 任务项运行配置工具.html ./
COPY 任务项运行配置工具.md ./

RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/backups \
    && chown -R app:app /app

USER app

EXPOSE 18080

CMD ["node", "server.js"]
