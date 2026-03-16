# Etapa de build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos solo los archivos necesarios para instalar deps
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Build de Next.js en modo producción
RUN npm run build

# Etapa de runtime (más liviana)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Puerto por defecto de Next.js
ENV PORT=3000

# Copiar solo lo necesario desde el builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/postcss.config.js ./postcss.config.js
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

CMD ["npm", "run", "start"]
