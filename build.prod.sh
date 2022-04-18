#!/bin/bash
cd ./api
./dockerfile.prod.sh
# cd ../app
# ./dockerfile.prod.sh
cd ../bot
./dockerfile.prod.sh
cd ../cron
./dockerfile.sh