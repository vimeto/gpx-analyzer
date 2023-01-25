FROM node:18 AS runner

ARG MapboxAccessTokenDev
ENV MapboxAccessTokenDev=$MapboxAccessTokenDev

RUN echo $MapboxAccessTokenDev

WORKDIR /app

COPY . .
COPY package*.json ./

RUN npm ci --legacy-peer-dep
RUN ls -al

ENV NODE_ENV production

RUN npm run build

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]
