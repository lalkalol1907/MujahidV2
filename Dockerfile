FROM node:18
ARG CONFIG_PHRASE
RUN apt-get update
copy / /src/
WORKDIR /src
RUN npm i
RUN ./scripts/decrypt_config.sh
RUN npm run test
RUN npm run build
CMD ["npm", "start"]
