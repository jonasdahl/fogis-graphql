FROM node:13.8.0

COPY .yarn .yarn
COPY .pnp.js .pnp.js
COPY .yarnrc.yml .yarnrc.yml
COPY package.json package.json
COPY yarn.lock yarn.lock

RUN yarn install

COPY . .

RUN yarn run build

EXPOSE 4000

ENTRYPOINT [ "yarn", "run", "serve" ]