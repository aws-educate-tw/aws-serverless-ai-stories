#!/bin/bash
sudo yum update && sudo yum install git -y

# Install Node Using NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
~/.nvm/nvm.sh
nvm install v18.11.0
nvm use v18.11.0

# Install Docker
sudo yum install docker
sudo usermod -a -G docker ec2-user
id ec2-user
newgrp docker

# Deploy
npm run install:all
npm run deploy