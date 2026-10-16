FROM node:24-bookworm-slim AS assets
WORKDIR /workspace
COPY . .
RUN npm ci && npm run build

FROM php:8.3-fpm-bookworm AS app
RUN apt-get update && apt-get install -y --no-install-recommends libicu-dev libzip-dev libpng-dev libsqlite3-dev unzip git \
    && docker-php-ext-install pdo_mysql pdo_sqlite bcmath intl zip gd pcntl \
    && pecl install redis && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY . .
COPY --from=assets /workspace/public/viewer ./public/viewer
COPY --from=assets /workspace/public/admin.css ./public/admin.css
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader \
    && mkdir -p storage/app/public storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && ln -s /var/www/html/storage/app/public /var/www/html/public/storage \
    && chown -R www-data:www-data storage bootstrap/cache
COPY infrastructure/docker/php.ini /usr/local/etc/php/conf.d/marketplace.ini
COPY infrastructure/docker/entrypoint.sh /usr/local/bin/marketplace-entrypoint
RUN chmod +x /usr/local/bin/marketplace-entrypoint
ENTRYPOINT ["marketplace-entrypoint"]
CMD ["php-fpm"]

FROM nginx:1.28-alpine AS web
COPY infrastructure/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=app /var/www/html/public /var/www/html/public
