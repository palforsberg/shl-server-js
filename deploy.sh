#!/bin/bash

set -e # exit on error

npm install
npm run tsc
npm run test

if [ -d "db" ]
then
    # backup
    now=$(date +'%Y%m%d')
    mkdir -p "db_backup/$now"
    cp -r db/* "db_backup/$now"
else
    mkdir -p db
fi

./start.sh 