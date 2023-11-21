FROM node:latest

WORKDIR /app

COPY . /app

RUN npm install

RUN npm link

CMD ["stfil-cli", "autoAction", "--init" ]
