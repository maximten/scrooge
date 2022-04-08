#!/bin/bash
cd ./api
./dockerfile.sh
cd ../app
./dockerfile.sh
cd ../bot
./dockerfile.sh