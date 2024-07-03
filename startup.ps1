#!/bin/bash

git pull
npm run build
node backend/backend.js
