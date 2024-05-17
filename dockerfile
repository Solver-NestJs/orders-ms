FROM node:21-alpine3.19

WORKDIR /usr/src/app

COPY package*.json yarn.lock ./

RUN yarn install

COPY . .


EXPOSE 3002

