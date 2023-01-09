#!/bin/bash

rm ./db/game_stats.json ./db/games_2022.json ./db/events_ws.json ./db/events.json ./db/live_status.json
npm run tsc
node ./dist/src/mock/mock-server-ws.js