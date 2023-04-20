FROM node:18
ARG CONFIG_PHRASE
RUN apt-get update
copy / /src/
WORKDIR /src
CMD ["npm", "start"]
