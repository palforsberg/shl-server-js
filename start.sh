#!/bin/bash

read secret < ./deployment/client_secret
node ./src/server.js $secret > deployment/console.log 2>&1 &

echo "Started $!"
echo $! > deployment/server.pid