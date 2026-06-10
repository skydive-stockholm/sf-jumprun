#!/bin/bash

git reset --hard HEAD
git clean -fdx --exclude=.env
git fetch
git reset origin/main --hard

npm install
npm run build

cd backend
npm install
cd ..

npm run backend
