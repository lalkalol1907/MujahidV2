FROM node:18
ARG prefix
ARG token
RUN apt-get update
copy / /src/
WORKDIR /src
CMD ["npm", "start"]
