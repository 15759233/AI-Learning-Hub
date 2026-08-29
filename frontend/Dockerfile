FROM node:22.14.0-bookworm-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend .
ARG VITE_DATA_MODE=api
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_ADMIN_PREVIEW_ORIGINS
ENV VITE_DATA_MODE=${VITE_DATA_MODE}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ADMIN_PREVIEW_ORIGINS=${VITE_ADMIN_PREVIEW_ORIGINS}
RUN npm run build

FROM nginx@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46
COPY deploy/compose/nginx-student.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend/dist /usr/share/nginx/html
EXPOSE 80
