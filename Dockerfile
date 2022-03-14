FROM node:14.17 as base

WORKDIR /usr/local/src/quizapp

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source
COPY src src

FROM base AS dev
COPY tsconfig.json .
RUN npx tsc
ENV NODE_PATH=./build
ENV DEBUG=routes:*,middleware:*,express:router
ENTRYPOINT ["npx", "nodemon", "build/start.js"]

FROM dev AS test
COPY e2e e2e
COPY e2e.jest.config.ts .
ENTRYPOINT ["npm", "run", "test:e2e"]

FROM base AS build
COPY build.tsconfig.json .
RUN npm run build

FROM node:14.17-alpine AS prod

WORKDIR /usr/local/quizapp

# Copy compiled src and deps
COPY --from=build /usr/local/src/quizapp/build build
COPY --from=build /usr/local/src/quizapp/node_modules node_modules

EXPOSE 8080

ENV NODE_ENV=production
ENV NODE_PATH=build
ENV DEBUG=routes:*,express:router
ENTRYPOINT ["node", "/usr/local/quizapp/build/start.js"]