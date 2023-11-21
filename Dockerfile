FROM node:latest

WORKDIR /app

COPY . /app

RUN npm install

RUN npm link

CMD ["sh", "./script/docker-start.sh", "$ACTION", "$NODEID", "$AVAILABLE", "$AMOUNT"]
