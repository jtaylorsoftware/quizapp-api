FROM node:14.17 as build

WORKDIR /usr/local/src/quizapp

# Copy server source
COPY package*.json ./
COPY src src
COPY build.tsconfig.json .

# Copy client source
COPY client/public client/public
COPY client/src client/src
COPY client/package*.json client/
COPY client/tsconfig.json client/

# Install server deps
RUN npm ci

# Install client deps
RUN npm ci --prefix client

# Build server
RUN npx tsc -p build.tsconfig.json

# Build client
RUN SKIP_PREFLIGHT_CHECK=true npm run build --prefix client

FROM node:14.17-alpine  

WORKDIR /usr/local/src/quizapp

# Copy compiled server src & deps
COPY --from=build /usr/local/src/quizapp/build .
COPY --from=build /usr/local/src/quizapp/node_modules node_modules

# Copy client prod build
COPY --from=build /usr/local/src/quizapp/client/build ./client/build

EXPOSE 8080

ENV NODE_ENV=production
ENV NODE_PATH=./
ENTRYPOINT ["node", "start.js"]