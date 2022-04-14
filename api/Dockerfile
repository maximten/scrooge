FROM node:16
WORKDIR /app
COPY *.json ./
RUN yarn
COPY src ./src
COPY .env ./.env
EXPOSE 8080
CMD ["yarn", "dev"]

