FROM node:24.5.0-alpine

WORKDIR /WEB
ENV CHOKIDAR_USEPOLLING=true

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

EXPOSE 5173
# Source bind mounts from Compose are watched by Vite for HMR.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

