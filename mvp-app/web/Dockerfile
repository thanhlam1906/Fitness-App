# syntax=docker/dockerfile:1.7
# Image web production (doc/design-trien-khai-v1.md §4): build trang web rồi để nginx phát, nginx cũng là
# cửa vào chuyển /api sang backend. Compose dev không dùng file này: dev chạy Vite dev server.
FROM node:22.23.3-alpine3.24 AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30.6-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
