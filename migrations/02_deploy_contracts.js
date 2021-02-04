const GUniswapV2Exchange = artifacts.require('GUniswapV2Exchange');
const GElasticTokenManager = artifacts.require('GElasticTokenManager');
const GPriceOracle = artifacts.require('GPriceOracle');
const GEtherBridge = artifacts.require('GEtherBridge');
const GTokenRegistry = artifacts.require('GTokenRegistry');
const rAAVE = artifacts.require('rAAVE');
const IERC20 = artifacts.require('IERC20');
const Factory = artifacts.require('Factory');
const Pair = artifacts.require('Pair');
const stkAAVE_rAAVE = artifacts.require('stkAAVE_rAAVE');
const stkGRO_rAAVE = artifacts.require('stkGRO_rAAVE');
const stkETH_rAAVE = artifacts.require('stkETH_rAAVE');

const UniswapV2_FACTORY = {
	'development': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
	'mainnet': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
	'ropsten': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
	'rinkeby': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
	'kovan': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
	'goerli': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
};

const GRO = {
	'development': '0x09e64c2B61a5f1690Ee6fbeD9baf5D6990F8dFd0',
	'mainnet': '0x09e64c2B61a5f1690Ee6fbeD9baf5D6990F8dFd0',
	'ropsten': '0x5BaF82B5Eddd5d64E03509F0a7dBa4Cbf88CF455',
	'rinkeby': '0x020e317e70B406E23dF059F3656F6fc419411401',
	'kovan': '0xFcB74f30d8949650AA524d8bF496218a20ce2db4',
	'goerli': '0x0000000000000000000000000000000000000000',
};

const WETH = {
	'development': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
	'mainnet': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
	'ropsten': '0xc778417E063141139Fce010982780140Aa0cD5Ab',
	'rinkeby': '0xc778417E063141139Fce010982780140Aa0cD5Ab',
	'kovan': '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
	'goerli': '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

module.exports = async (deployer, network, [account]) => {
  // publish dependencies
  await deployer.deploy(GUniswapV2Exchange);
  await deployer.deploy(GElasticTokenManager);
  await deployer.deploy(GPriceOracle);
  await deployer.deploy(GEtherBridge);
  await deployer.deploy(GTokenRegistry);

  // setup deployment helpers
  const faucet = await GUniswapV2Exchange.deployed();
  const factory = await Factory.at(UniswapV2_FACTORY[network]);
  const registry = await GTokenRegistry.deployed();

  // publish rAAVE contract
  deployer.link(GElasticTokenManager, rAAVE);
  deployer.link(GPriceOracle, rAAVE);
  await deployer.deploy(rAAVE, `${3e18}`);
  const raave = await rAAVE.deployed();
  await registry.registerNewToken(raave.address, ZERO_ADDRESS);

  {
    // mint AAVE
    const aave = await IERC20.at(await raave.referenceToken());
    await faucet.faucet(aave.address, `${1e18}`, { value: `${2e18}` });

    // create pool
    await factory.createPair(aave.address, raave.address);
    const pair = await Pair.at(await factory.getPair(aave.address, raave.address));
    await aave.transfer(pair.address, `${1e18}`);
    await raave.transfer(pair.address, `${1e18}`);
    await pair.mint(account);

    // publish staking contract
    await deployer.deploy(stkAAVE_rAAVE, pair.address, raave.address);
    const stkaave_raave = await stkAAVE_rAAVE.deployed();
    await pair.transfer(stkaave_raave.address, `${1}`);
    await registry.registerNewToken(stkaave_raave.address, ZERO_ADDRESS);

    // stake LP shares
    const shares = await pair.balanceOf(account);
    await pair.approve(stkaave_raave.address, shares);
    await stkaave_raave.deposit(shares);
  }

  {
    // mint GRO
    const gro = await IERC20.at(GRO[network]);
    await faucet.faucet(gro.address, `${1e18}`, { value: `${2e18}` });

    // create pool
    await factory.createPair(gro.address, raave.address);
    const pair = await Pair.at(await factory.getPair(gro.address, raave.address));
    await gro.transfer(pair.address, `${1e18}`);
    await raave.transfer(pair.address, `${1e18}`);
    await pair.mint(account);
    await raave.addUniswapV2PostRebaseTarget(pair.address);

    // publish staking contract
    await deployer.deploy(stkGRO_rAAVE, pair.address, raave.address);
    const stkgro_raave = await stkGRO_rAAVE.deployed();
    await pair.transfer(stkgro_raave.address, `${1}`);
    await registry.registerNewToken(stkgro_raave.address, ZERO_ADDRESS);

    // stake LP shares
    const shares = await pair.balanceOf(account);
    await pair.approve(stkgro_raave.address, shares);
    await stkgro_raave.deposit(shares);
  }

  {
    // mint WETH
    const weth = await IERC20.at(WETH[network]);
    await faucet.faucet(weth.address, `${1e18}`, { value: `${2e18}` });

    // create pool
    await factory.createPair(weth.address, raave.address);
    const pair = await Pair.at(await factory.getPair(weth.address, raave.address));
    await weth.transfer(pair.address, `${1e18}`);
    await raave.transfer(pair.address, `${1e18}`);
    await pair.mint(account);
    await raave.addUniswapV2PostRebaseTarget(pair.address);

    // publish staking contract
    await deployer.deploy(stkETH_rAAVE, pair.address, raave.address);
    const stketh_raave = await stkETH_rAAVE.deployed();
    await pair.transfer(stketh_raave.address, `${1}`);
    await registry.registerNewToken(stketh_raave.address, ZERO_ADDRESS);

    // stake LP shares
    const shares = await pair.balanceOf(account);
    await pair.approve(stketh_raave.address, shares);
    await stketh_raave.deposit(shares);
  }

  {
    // activate oracle and rebase
    const aave = await IERC20.at(await raave.referenceToken());
    const pair = await Pair.at(await factory.getPair(aave.address, raave.address));
    await raave.activateOracle(pair.address);
    await raave.activateRebase();
  }
};
