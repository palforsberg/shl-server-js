#!/bin/bash

./stop.sh

node ./dist/src/server.js './deployment/config.json' > deployment/console.log 2>&1 &

echo "Started $!"
echo $! > deployment/server.pid