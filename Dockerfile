FROM node:12.20.0-alpine

WORKDIR /slack-app
COPY . ./
COPY ./docker/entrypoint.sh /entrypoint.sh

RUN export LANG=en_US.UTF-8 \
    && apk --no-cache add curl \
    && yarn install \
    && yarn run build \
    && cp -a build / \
    && rm -rf node_modules \
    && yarn install --production \
    && cp -a node_modules /build

WORKDIR /build

ENV NODE_ENV=production

ENTRYPOINT ["/entrypoint.sh"]
