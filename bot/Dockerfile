FROM node:16
WORKDIR /app
COPY *.json ./
RUN yarn
COPY src ./src
CMD ["yarn", "start"]


