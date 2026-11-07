FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
# Listed one by one so working files like .hallmark/ never reach the image.
COPY index.html styles.css tokens.css base.css main.js favicon.ico /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
