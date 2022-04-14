FROM node:16
WORKDIR /app
COPY *.json ./
RUN yarn
COPY src ./src
COPY transactions.csv ./transactions.csv
CMD ["yarn", "start"]


