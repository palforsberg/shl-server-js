#!/bin/bash

./stop.sh

node ./dist/src/server.js './deployment/config.json' &

echo "Started $!"
echo $! > deployment/server.pid