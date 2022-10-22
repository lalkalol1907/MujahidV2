FROM node:16
RUN apt-get update
copy / .
RUN npm i
CMD ["node", "index"]
