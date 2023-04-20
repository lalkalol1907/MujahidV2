FROM node:16
RUN apt-get update
copy / /src/
WORKDIR /src
RUN npm i
RUN ./.github/scripts/decrypt_config.sh
RUN npm run build
CMD ["npm", "start"]
