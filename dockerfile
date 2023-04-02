FROM node:16
RUN apt-get update
copy / /src/
WORKDIR /src
RUN npm i

RUN npm run build
CMD ["npm", "start"]
