FROM node:latest

# Create app directory
RUN mkdir -p /usr/src/UnstructuredData
WORKDIR /usr/src/UnstructuredData
# Bundle app source
COPY . /usr/src/UnstructuredData

# Install app dependencies
#On Docker without adding node-gyp explicitly gives an error about node-gyp missing
RUN yarn global add node-gyp
RUN yarn global add typescript
RUN yarn install
RUN tsc -p .

EXPOSE 8085

CMD ["npm","start"]
