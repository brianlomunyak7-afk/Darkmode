# ---- Stage 1: build the site (package the extension + assemble web root) ----
FROM alpine:3.20 AS builder

RUN apk add --no-cache bash zip python3

WORKDIR /app
COPY . .

# Produce build/site: static pages, icon, downloads/<zip>, version.json
RUN bash scripts/build-site.sh

# ---- Stage 2: serve the static site ----
FROM nginx:1.27-alpine

COPY --from=builder /app/build/site /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

EXPOSE 80
