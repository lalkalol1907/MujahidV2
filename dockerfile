FROM node:18
RUN apt-get update
copy / /src/
WORKDIR /src
CMD ["npm", "start"]
