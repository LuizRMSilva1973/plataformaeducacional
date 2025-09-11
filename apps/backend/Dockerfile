FROM node:20
WORKDIR /workspace

# Install dependencies (monorepo-aware)
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci || npm install

# Copy source
COPY . .

ENV PORT=3000
EXPOSE 3000

# Ensure DB migrations are applied, then start dev server
CMD sh -c "npm -w @edu/backend run prisma:generate \
  && npm -w @edu/backend run prisma:deploy || true \
  && npm -w @edu/backend run prisma:seed || true; \
  npm -w @edu/backend run dev"
