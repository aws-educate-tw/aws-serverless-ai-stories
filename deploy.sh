#!/bin/bash
# Prerequisites before running this script
## sudo yum update && sudo yum install git -y
## git clone https://github.com/aws-educate-tw/aws-serverless-ai-stories.git
## cd aws-serverless-ai-stories/
## git checkout dev
## chmod +x deploy.sh
## aws configure
## ./deploy.sh

# Check if AWS credentials are configured before installing anything
aws sts get-caller-identity --query "Account" --output text
if [[ $? -ne 0 ]] ; then
    echo "AWS not configured properly!" 
    exit 1
fi
# Install Node Using NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
chmod +x ~/.nvm/nvm.sh
echo 'export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> cd ~/.bashrc
source ~/.bashrc
nvm install v18.11.0
nvm use v18.11.0
npm install aws-cdk -g

# Install Docker
sudo yum install docker -y
sudo usermod -a -G docker ec2-user
id ec2-user
newgrp docker <<EONG
EONG # newgrp starts a new subshell, 'EONG' is required in order to prevent script from stopping 
sudo systemctl enable docker
sudo systemctl start docker

# Bootstrap
cdk bootstrap "aws://$(aws sts get-caller-identity --query "Account" --output text)/us-east-1"
# Deploy
npm run install:all
npm run deploy

# Populate Database
npm run populate-db