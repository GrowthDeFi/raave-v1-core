const GUniswapV2Exchange = artifacts.require('GUniswapV2Exchange');
const GElasticTokenManager = artifacts.require('GElasticTokenManager');
const GPriceOracle = artifacts.require('GPriceOracle');
const rAAVE = artifacts.require('rAAVE');
const IERC20 = artifacts.require('IERC20');
const Factory = artifacts.require('Factory');
const Pair = artifacts.require('Pair');
const stkAAVE_rAAVE = artifacts.require('stkAAVE_rAAVE');

module.exports = async (deployer, network, [account]) => {
  // publish helpers
  await deployer.deploy(GUniswapV2Exchange);

  // publish dependencies
  await deployer.deploy(GElasticTokenManager);
  await deployer.deploy(GPriceOracle);

  // publish contract
  deployer.link(GElasticTokenManager, rAAVE);
  deployer.link(GPriceOracle, rAAVE);
  await deployer.deploy(rAAVE);
  const raave = await rAAVE.deployed();

  // mint reference token
  const exchange = await GUniswapV2Exchange.deployed();
  const aave = await IERC20.at(await raave.referenceToken());
  const supply = await raave.balanceOf(account);
  let minted = await aave.balanceOf(account);
  while (BigInt(minted) < BigInt(supply)) {
    let amount = String(BigInt(supply) - BigInt(minted));
    if (BigInt(amount) > BigInt(`${50e18}`)) amount = `${50e18}`;
    const value = `${10e18}`;
    await exchange.faucet(aave.address, amount, { value });
    minted = await aave.balanceOf(account);
  }

  // create pool
  const factory = await Factory.at('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f');
  await factory.createPair(aave.address, raave.address);
  const pair = await Pair.at(await factory.getPair(aave.address, raave.address));
  await aave.transfer(pair.address, supply);
  await raave.transfer(pair.address, supply);
  await pair.mint(account);

  // activate oracle and rebase
  await raave.activateOracle(pair.address);
  await raave.activateRebase();

  // publish staking contract
  await deployer.deploy(stkAAVE_rAAVE, pair.address, raave.address);  
  const stkaave_raave = await stkAAVE_rAAVE.deployed();
  await pair.transfer(stkaave_raave.address, `${1}`);
};