# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:24.22.2-alpine AS build

WORKDIR /app

# Copiar manifests primero para aprovechar cache de capas
COPY package*.json ./

# Instalar TODAS las dependencias (incluye devDependencies para compilar)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Compilar TypeScript → dist/
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:24.22.2-alpine AS production

WORKDIR /app

# Copiar manifests
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el build compilado desde el stage anterior
COPY --from=build /app/dist ./dist

# Usuario no-root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Puerto local por defecto; en la nube se utiliza la variable PORT.
EXPOSE 3500

CMD ["node", "dist/main"]
