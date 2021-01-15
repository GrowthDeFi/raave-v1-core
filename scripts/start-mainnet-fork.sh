#!/bin/bash

GAS_LIMIT=100000000

source .env

npx ganache-cli \
	-h 0.0.0.0 \
	-i 1 \
	-l $GAS_LIMIT \
	-f wss://mainnet.infura.io/ws/v3/$INFURA_PROJECT_ID \
	--account $PRIVATE_KEY,100000000000000000000
