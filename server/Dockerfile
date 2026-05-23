FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY rtmp-relay.js ./

EXPOSE 8080
CMD ["node", "rtmp-relay.js"]
