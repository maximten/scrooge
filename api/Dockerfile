FROM node:16
WORKDIR /app
COPY *.json ./
COPY src ./src
RUN yarn
EXPOSE 8080
CMD ["yarn", "dev"]

