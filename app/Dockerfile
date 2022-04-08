FROM node:16
WORKDIR /app
COPY *.json ./
COPY src ./src
COPY public ./public
RUN yarn
EXPOSE 3000
CMD ["yarn", "start"]