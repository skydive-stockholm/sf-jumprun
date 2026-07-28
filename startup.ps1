#!/bin/bash
set -euo pipefail

# data.json holds the settings (Mapbox key, map center, altitudes) and is
# gitignored, so it has to survive the clean.
git clean -fdx --exclude=.env --exclude=data.json
git fetch
git reset origin/main --hard

npm install
npm run build

cd backend
npm install
cd ..

npm run backend:prod
