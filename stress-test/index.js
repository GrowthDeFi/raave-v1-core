require('dotenv').config();
const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

// process

function sleep(delay) {
  return new Promise((resolve, reject) => setTimeout(resolve, delay));
}

function abort(e) {
  e = e || new Error('Program aborted');
  console.error(e.stack);
  process.exit(1);
}

function exit() {
  process.exit(0);
}

function entrypoint(main) {
  const args = process.argv;
  (async () => { try { await main(args); } catch (e) { abort(e); } exit(); })();
}

// web3

const network = process.env['NETWORK'] || 'development';

const infuraProjectId = process.env['INFURA_PROJECT_ID'] || '';

const privateKey = process.env['PRIVATE_KEY'];
if (!privateKey) throw new Error('Unknown private key');

const NETWORK_ID = {
  'mainnet': '1',
  'ropsten': '3',
  'rinkeby': '4',
  'kovan': '42',
  'goerli': '5',
  'development': '1',
};

const networkId = NETWORK_ID[network];

const HTTP_PROVIDER_URL = {
  'mainnet': 'https://mainnet.infura.io/v3/' + infuraProjectId,
  'ropsten': 'https://ropsten.infura.io/v3/' + infuraProjectId,
  'rinkeby': 'https://rinkeby.infura.io/v3/' + infuraProjectId,
  'kovan': 'https://kovan.infura.io/v3/' + infuraProjectId,
  'goerli': 'https://goerli.infura.io/v3/' + infuraProjectId,
  'development': 'http://localhost:8545/',
};

const web3 = new Web3(new HDWalletProvider(privateKey, HTTP_PROVIDER_URL[network]));

function valid(amount, decimals) {
  const regex = new RegExp(`^\\d+${decimals > 0 ? `(\\.\\d{1,${decimals}})?` : ''}$`);
  return regex.test(amount);
}

function coins(units, decimals) {
  if (!valid(units, 0)) throw new Error('Invalid amount');
  if (decimals == 0) return units;
  const s = units.padStart(1 + decimals, '0');
  return s.slice(0, -decimals) + '.' + s.slice(-decimals);
}

function units(coins, decimals) {
  if (!valid(coins, decimals)) throw new Error('Invalid amount');
  let i = coins.indexOf('.');
  if (i < 0) i = coins.length;
  const s = coins.slice(i + 1);
  return coins.slice(0, i) + s + '0'.repeat(decimals - s.length);
}

// main

const [account] = web3.currentProvider.getAddresses();

async function getEthBalance(address) {
  const amount = await web3.eth.getBalance(address);
  return coins(amount, 18);
}

async function mint(token, amount, maxCost) {
  const EXCHANGE_ABI = require('../build/contracts/GUniswapV2Exchange.json').abi;
  const EXCHANGE_ADDRESS = require('../build/contracts/GUniswapV2Exchange.json').networks[networkId].address;
  const contract = new web3.eth.Contract(EXCHANGE_ABI, EXCHANGE_ADDRESS);
  const _amount = units(amount, token.decimals);
  const value = units(maxCost, 18);
  await contract.methods.faucet(token.address, _amount).send({ from: account, value });
}

async function convert(from, to, amount) {
  const EXCHANGE_ABI = require('../build/contracts/GUniswapV2Exchange.json').abi;
  const EXCHANGE_ADDRESS = require('../build/contracts/GUniswapV2Exchange.json').networks[networkId].address;
  const contract = new web3.eth.Contract(EXCHANGE_ABI, EXCHANGE_ADDRESS);
  await from.approve(EXCHANGE_ADDRESS, amount);
  const _amount = units(amount, from.decimals);
  await contract.methods.direct(from.address, to.address, _amount).send({ from: account });
}

async function newERC20(abi, address) {
  let self;
  const contract = new web3.eth.Contract(abi, address);
  const [name, symbol, _decimals] = await Promise.all([
    contract.methods.name().call(),
    contract.methods.symbol().call(),
    contract.methods.decimals().call(),
  ]);
  const decimals = Number(_decimals);
  return (self = {
    address,
    name,
    symbol,
    decimals,
    totalSupply: async () => {
      const amount = await contract.methods.totalSupply().call();
      return coins(amount, decimals);
    },
    balanceOf: async (owner) => {
      const amount = await contract.methods.balanceOf(owner).call();
      return coins(amount, decimals);
    },
    allowance: async (owner, spender) => {
      const amount = await contract.methods.allowance(owner, spender).call();
      return coins(amount, decimals);
    },
    approve: async (spender, amount) => {
      const _amount = units(amount, self.decimals);
      return (await contract.methods.approve(spender, _amount).send({ from: account })).status;
    }
  });
}

async function newGToken(abi, address) {
  let self;
  const fields = await newERC20(abi, address);
  const contract = new web3.eth.Contract(abi, address);
  const reserveToken = await newERC20(abi, await contract.methods.reserveToken().call());
  return (self = {
    ...fields,
    reserveToken,
    totalReserve: async () => {
      const amount = await contract.methods.totalReserve().call();
      return coins(amount, self.reserveToken.decimals);
    },
    deposit: async (cost) => {
      const _cost = units(cost, self.reserveToken.decimals);
      const gasEstimate = await contract.methods.deposit(_cost).estimateGas({ from: account });
      console.log('gas estimate', gasEstimate);
      const { gasUsed } = await contract.methods.deposit(_cost).send({ from: account });
      console.log('gas used', gasUsed);
    },
    withdraw: async (grossShares) => {
      const _grossShares = units(grossShares, self.decimals);
      const gasEstimate = await contract.methods.withdraw(_grossShares).estimateGas({ from: account });
      console.log('gas estimate', gasEstimate);
      const { gasUsed } = await contract.methods.withdraw(_grossShares).send({ from: account });
      console.log('gas used', gasUsed);
    },
  });
}

async function newGTokenElastic(abi, address) {
  let self;
  const fields = await newERC20(abi, address);
  const contract = new web3.eth.Contract(abi, address);
  const referenceToken = await newERC20(abi, await contract.methods.referenceToken().call());
  return (self = {
    ...fields,
    referenceToken,
    scalingFactor: async () => {
      const factor = await contract.methods.scalingFactor().call();
      return coins(factor, self.decimals);
    },
    lastExchangeRate: async () => {
      const factor = await contract.methods.lastExchangeRate().call();
      return coins(factor, self.decimals);
    },
    currentExchangeRate: async () => {
      const factor = await contract.methods.currentExchangeRate().call();
      return coins(factor, self.decimals);
    },
    rebaseAvailable: async () => {
      return await contract.methods.rebaseAvailable().call();
    },
    rebase: async () => {
      const gasEstimate = await contract.methods.rebase().estimateGas({ from: account });
      console.log('gas estimate', gasEstimate);
      const { gasUsed } = await contract.methods.rebase().send({ from: account });
      console.log('gas used', gasUsed);
    },
    setRebaseMinimumDeviation: async (minimumDeviation) => {
      await contract.methods.setRebaseMinimumDeviation(minimumDeviation).send({ from: account });
    },
    setRebaseDampeningFactor: async (dampeningFactor) => {
      await contract.methods.setRebaseDampeningFactor(dampeningFactor).send({ from: account });
    },
    setRebaseTreasuryMintPercent: async (treasuryMintPercent) => {
      await contract.methods.setRebaseTreasuryMintPercent(treasuryMintPercent).send({ from: account });
    },
    setRebaseTimingParameters: async (minimumInterval, windowOffset, windowLength) => {
      await contract.methods.setRebaseTimingParameters(minimumInterval, windowOffset, windowLength).send({ from: account });
    },
  });
}

function randomInt(limit) {
  return Math.floor(Math.random() * limit)
}

function randomAmount(token, balance) {
  const _balance = units(balance, token.decimals);
  const _amount = randomInt(Number(_balance) + 1);
  return coins(String(_amount), token.decimals);
}

async function ganacheAdvanceTime(time) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [time], id: Date.now() }, (err, result) => {
      if (err) return reject(err);
      return resolve(result);
    });
  });
}

async function ganacheAdvanceBlock() {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', id: Date.now() }, (err, result) => {
      if (err) return reject(err);
      const block = web3.eth.getBlock('latest');
      return resolve(block.hash);
    });
  });
}

async function testToken(gtoken)
{
  const rtoken = gtoken.reserveToken;
  const ftoken = gtoken.referenceToken;

  console.log(network);
  console.log(gtoken.name, gtoken.symbol, gtoken.decimals);
  if (rtoken) {
    console.log(rtoken.name, rtoken.symbol, rtoken.decimals);
  }
  if (ftoken) {
    console.log(ftoken.name, ftoken.symbol, ftoken.decimals);
  }
  if (rtoken) {
    console.log('approve', await rtoken.approve(gtoken.address, '1000000000'));
    console.log('rtoken allowance', await rtoken.allowance(account, gtoken.address));
  }
  console.log();

  async function printSummary() {
    console.log('total supply', await gtoken.totalSupply());
    if (rtoken) {
      console.log('total reserve', await gtoken.totalReserve());
    }
    if (ftoken) {
      const factor = await gtoken.scalingFactor();
      console.log('scaling factor', factor);
      try {
        const lastRate = await gtoken.lastExchangeRate();
        console.log('last exchange rate', lastRate);
      } catch {}
      try {
        const currentRate = await gtoken.currentExchangeRate();
        console.log('current exchange rate', currentRate);
      } catch {}
    }
    console.log('gtoken balance', await gtoken.balanceOf(account));
    if (rtoken) {
      console.log('rtoken balance', await rtoken.balanceOf(account));
    }
    if (ftoken) {
      console.log('ftoken balance', await ftoken.balanceOf(account));
    }
    console.log('eth balance', await getEthBalance(account));
    console.log();
  }

  await printSummary();

  if (rtoken) {
    console.log('minting rtoken');
    await mint(rtoken, '1', '1');
    console.log();
  }
  if (ftoken) {
    console.log('minting ftoken');
    await mint(ftoken, '0.0001', '1');
    console.log();
  }

  if (ftoken) {
    console.log('setting rebase parameters');
    await gtoken.setRebaseMinimumDeviation(1);
    await gtoken.setRebaseDampeningFactor(1);
    await gtoken.setRebaseTreasuryMintPercent(0);
    await gtoken.setRebaseTimingParameters(24 * 60 * 60, 0, 23 * 60 * 60);
    console.log();
  }

  const ACTIONS = [];
  if (rtoken) {
    ACTIONS.push('deposit');
    ACTIONS.push('depositAll');
    ACTIONS.push('withdraw');
    ACTIONS.push('withdrawAll');
  }
  if (ftoken) {
    ACTIONS.push('rebase');
    ACTIONS.push('buy');
    ACTIONS.push('buyAll');
    ACTIONS.push('sell');
    ACTIONS.push('sellAll');
  }

  const MAX_EXECUTED_ACTIONS = 1000;

  for (let i = 0; i < MAX_EXECUTED_ACTIONS; i++) {

    await printSummary();

    await sleep(5 * 1000);

    await ganacheAdvanceTime(randomInt(24 * 60 * 60));

    await ganacheAdvanceBlock();

    const action = ACTIONS[randomInt(ACTIONS.length)];

    if (action == 'deposit') {
      const balance = await rtoken.balanceOf(account);
      const amount = randomAmount(rtoken, balance);
      console.log('DEPOSIT', amount, rtoken.symbol);
      try {
        if (Number(amount) > 0) await gtoken.deposit(amount);
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

    if (action == 'depositAll') {
      const balance = await rtoken.balanceOf(account);
      const amount = balance;
      console.log('DEPOSIT ALL', amount, rtoken.symbol);
      try {
        if (Number(amount) > 0) await gtoken.deposit(amount);
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

    if (action == 'withdraw') {
      const balance = await gtoken.balanceOf(account);
      const amount = randomAmount(gtoken, balance);
      console.log('WITHDRAW', amount, gtoken.symbol);
      try {
        if (Number(amount) > 0) await gtoken.withdraw(amount);
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

    if (action == 'withdrawAll') {
      const balance = await gtoken.balanceOf(account);
      const amount = balance;
      console.log('WITHDRAW ALL', amount, gtoken.symbol);
      try {
        if (Number(amount) > 0) await gtoken.withdraw(amount);
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

    if (action == 'rebase') {
      const available = await gtoken.rebaseAvailable();
      console.log('REBASE', available, gtoken.symbol);
      try {
        if (available) await gtoken.rebase();
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

    if (action == 'buy') {
      const balance = await ftoken.balanceOf(account);
      const amount = randomAmount(ftoken, balance);
      console.log('BUY', amount, ftoken.symbol);
      try {
        if (Number(amount) > 0) await convert(ftoken, gtoken, amount);
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

    if (action == 'buyAll') {
      const balance = await ftoken.balanceOf(account);
      const amount = balance;
      console.log('BUY ALL', amount, ftoken.symbol);
      try {
        if (Number(amount) > 0) await convert(ftoken, gtoken, amount);
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

    if (action == 'sell') {
      const balance = await gtoken.balanceOf(account);
      const amount = randomAmount(gtoken, balance);
      console.log('SELL', amount, gtoken.symbol);
      try {
        if (Number(amount) > 0) await convert(gtoken, ftoken, amount);
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

    if (action == 'sellAll') {
      const balance = await gtoken.balanceOf(account);
      const amount = balance;
      console.log('SELL ALL', amount, gtoken.symbol);
      try {
        if (Number(amount) > 0) await convert(gtoken, ftoken, amount);
      } catch (e) {
        console.log('!!', e.message);
      }
      continue;
    }

  }
}

async function main(args) {
  const name = args[2] || 'rAAVE';
  const TOKEN_ABI = require('../build/contracts/' + name + '.json').abi;
  const TOKEN_ADDRESS = require('../build/contracts/' + name + '.json').networks[networkId].address;
  const token = await newGTokenElastic(TOKEN_ABI, TOKEN_ADDRESS);
  await testToken(token);
}

entrypoint(main);
