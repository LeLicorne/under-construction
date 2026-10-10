FROM nginx:alpine

COPY index.html mentions-legales.html confidentialite.html /opt/templates/
COPY main.js style.css config.js legal.js legal.css /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY docker/40-site-config.sh /docker-entrypoint.d/40-site-config.sh
RUN chmod +x /docker-entrypoint.d/40-site-config.sh

EXPOSE 80
