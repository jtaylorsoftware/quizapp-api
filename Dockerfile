FROM node:14.17 as base

WORKDIR /usr/local/src/quizapp

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source
COPY src src

FROM base AS dev
COPY tsconfig.json .
COPY openapi openapi
RUN npx tsc
ENV NODE_PATH=./build
ENV DEBUG=routes:*,middleware:*,express:router
ENTRYPOINT ["npx", "nodemon", "--inspect=0.0.0.0:9229", "build/start.js"]

FROM dev AS test
COPY e2e e2e
COPY e2e.jest.config.ts .
ENV DEBUG='middleware:errorHandler'
ENTRYPOINT ["node", \
    "--inspect=0.0.0.0:9229", \
    "./node_modules/.bin/jest", \
    "--testPathPattern=e2e", \
    "--config=e2e.jest.config.ts", \
    "--runInBand"]

FROM base AS build
COPY build.tsconfig.json .
RUN npm run build

FROM node:14.17-alpine AS prod

RUN mkdir -p /home/node/quizapp \
    && chown -R node:node /home/node/quizapp

WORKDIR /home/node/quizapp

# Copy compiled src and deps
COPY --chown=node:node --from=build /usr/local/src/quizapp/build build
COPY --chown=node:node --from=build /usr/local/src/quizapp/node_modules node_modules

USER node

EXPOSE 8080

ENV NODE_ENV=production
ENV NODE_PATH=build
ENV DEBUG=routes:*,express:router
ENV ALLOWED_ORIGIN='https://www.makequizzes.online'
ENTRYPOINT ["node", "build/start.js"]