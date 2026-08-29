FROM node:22.14.0-bookworm-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS build
WORKDIR /workspace
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/contracts/src packages/contracts/src
COPY admin-web/package.json admin-web/package-lock.json admin-web/
RUN cd admin-web && npm ci
COPY admin-web admin-web
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN cd admin-web && npm run build

FROM nginx@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46
COPY deploy/compose/nginx-admin.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/admin-web/dist /usr/share/nginx/html
EXPOSE 80
