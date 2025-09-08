FROM node:20-alpine
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["sh", "-c", "npm -w @edu/web run dev -- --host 0.0.0.0"]

