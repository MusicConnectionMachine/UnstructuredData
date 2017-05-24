#!/bin/bash
cd ~ \
&& curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh \
&& sudo bash nodesource_setup.sh \
&& export DEBIAN_FRONTEND=noninteractive \
&& sudo apt-get -y install nodejs \
&& sudo apt-get -y install build-essential \
&& sudo rm -rf UnstructuredData \
&& git clone https://github.com/MusicConnectionMachine/UnstructuredData.git \
&& cd UnstructuredData \
&& sudo npm install -g yarn \
&& sudo yarn install \
&& sudo npm run compile \