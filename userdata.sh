#!/bin/bash
sudo apt update
sudo apt install nodejs -y
sudo apt install npm -y
sudo git clone https://github.com/VCNinc/pki-anonymization-experiment
cd pki-anonymization-experiment
sudo npm install
sudo npm run amazon
