#!/bin/bash

./stop.sh

read secret < ./deployment/client_secret
node ./dist/server.js $secret > deployment/console.log 2>&1 &

echo "Started $!"
echo $! > deployment/server.pid