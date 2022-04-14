FROM node:16
WORKDIR /app
COPY *.json ./
RUN yarn
COPY src ./src
COPY public ./public
EXPOSE 3000
CMD ["yarn", "start"]