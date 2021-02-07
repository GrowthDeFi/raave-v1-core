# rAAVE V1 Core

[![Truffle CI Actions Status](https://github.com/GrowthDeFi/raave-v1-core/workflows/Truffle%20CI/badge.svg)](https://github.com/GrowthDeFi/raave-v1-core/actions)

This repository contains the source code for the rAAVE smart contracts
(Version 1) and related support code.

## Deployed Contracts

| Token         | Mainnet Address                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| rAAVE         | [0x3371De12E8734c76F70479Dae3A9f3dC80CDCEaB](https://etherscan.io/address/0x3371De12E8734c76F70479Dae3A9f3dC80CDCEaB) |
| stkAAVE/rAAVE | [0x4e550ec834B78d38ce3CB101766e8F04Db3Bc05d](https://etherscan.io/address/0x4e550ec834B78d38ce3CB101766e8F04Db3Bc05d) |
| stkGRO/rAAVE  | [0x0EFB384d843A191c02F5C4470D0f9EC0122a1c0b](https://etherscan.io/address/0x0EFB384d843A191c02F5C4470D0f9EC0122a1c0b) |
| stkETH/rAAVE  | [0x153Bccf926281F8Baec54D04f7aDF4F60eADCd07](https://etherscan.io/address/0x153Bccf926281F8Baec54D04f7aDF4F60eADCd07) |

| Token         | Kovan Address                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| rAAVE         | [0x8093f3ed0caec39ff182243362d167714cc02f99](https://kovan.etherscan.io/address/0x8093f3ed0caec39ff182243362d167714cc02f99) |
| stkAAVE/rAAVE | [0x42454d32ca5da46615a142fe0242c0248fa6b1ec](https://kovan.etherscan.io/address/0x42454d32ca5da46615a142fe0242c0248fa6b1ec) |
| stkGRO/rAAVE  | [0x9170E52390F8d80aE3ba67aef11dc1877f9996C3](https://kovan.etherscan.io/address/0x9170E52390F8d80aE3ba67aef11dc1877f9996C3) |
| stkETH/rAAVE  | [0x3c7816583A6a6b23Ef531Ab7da9c6A201548ca40](https://kovan.etherscan.io/address/0x3c7816583A6a6b23Ef531Ab7da9c6A201548ca40) |

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

Configuring the repository:

    $ npm i

Compiling the smart contracts:

    $ npm run build

Deploying the smart contracts (locally):

    $ ./scripts/start-mainnet-fork.sh & npm run deploy

Running the unit tests:

    $ ./scripts/start-mainnet-fork.sh & npm run test

Running the stress test:

    $ ./scripts/start-mainnet-fork.sh & npm run stress-test

_(Standard installation of Node 14.15.4 on Ubuntu 20.04)_
