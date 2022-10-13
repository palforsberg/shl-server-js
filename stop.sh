#!/bin/bash

./node_modules/forever/bin/forever stop ./dist/src/server.js
echo "Stopped"