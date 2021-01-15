# rAAVE V1 Core

[![Truffle CI Actions Status](https://github.com/GrowthDeFi/raave-v1-core/workflows/Truffle%20CI/badge.svg)](https://github.com/GrowthDeFi/raave-v1-core/actions)

This repository contains the source code for the rAAVE smart contracts
(Version 1) and related support code.

## Deployed Contracts

| Token         | Kovan Address                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| rAAVE         | [0x8093f3ed0caec39ff182243362d167714cc02f99](https://kovan.etherscan.io/address/0x8093f3ed0caec39ff182243362d167714cc02f99) |
| stkAAVE/rAAVE | [0x42454d32ca5da46615a142fe0242c0248fa6b1ec](https://kovan.etherscan.io/address/0x42454d32ca5da46615a142fe0242c0248fa6b1ec) |

## Repository Organization

* [/contracts/](contracts). This folder is where the smart contract source code
  resides.
* [/migrations/](migrations). This folder hosts the relevant set of Truffle
  migration scripts used to publish the smart contracts to the blockchain.
* [/scripts/](scripts). This folder contains a script to run a local mainnet
  fork.
* [/stress-test/](stress-test). This folder contains code to assist in stress
  testing the core contract functionality by performing a sequence of random
  operations.
* [/test/](test). This folder contains a set of relevant unit tests for Truffle
  written in Solidity.

## Building, Deploying and Testing

configuring the repository:

    $ npm i

Compiling the smart contracts:

    $ npm run build

Deploying the smart contracts (locally):

    $ ./scripts/start-mainnet-fork.sh & npm run deploy

Running the unit tests:

    $ ./scripts/start-mainnet-fork.sh & npm run test

Running the stress test:

    $ ./scripts/start-mainnet-fork.sh & npm run stress-test

