#!/bin/bash

git pull
npm install
npm run build

cd backend
npm install
node backend.js
