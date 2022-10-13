#!/bin/bash

./stop.sh

./node_modules/forever/bin/forever start ./dist/src/server.js './deployment/config.json' 

echo "Started"