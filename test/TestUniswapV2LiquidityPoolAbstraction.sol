// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.6.0;

import { Assert } from "truffle/Assert.sol";

import { Env } from "./Env.sol";

import { Factory } from "../contracts/interop/UniswapV2.sol";

import { UniswapV2LiquidityPoolAbstraction } from "../contracts/modules/UniswapV2LiquidityPoolAbstraction.sol";

import { $ } from "../contracts/network/$.sol";

contract TestUniswapV2LiquidityPoolAbstraction is Env
{
	function test01() external
	{
		address _pair = Factory($.UniswapV2_FACTORY).getPair($.AAVE, $.WETH);

		_burnAll(_pair);
		_burnAll($.AAVE);
		_burnAll($.WETH);
		_mint($.WETH, 1e18);

		Assert.equal(_getBalance(_pair), 0e18, "Pair balance must be 0e18");
		Assert.equal(_getBalance($.AAVE), 0e18, "AAVE balance must be 0e18");
		Assert.equal(_getBalance($.WETH), 1e18, "WETH balance must be 1e18");

		uint256 _estimatedShares = UniswapV2LiquidityPoolAbstraction._estimateJoinPool(_pair, $.WETH, 1e18);
		uint256 _shares = UniswapV2LiquidityPoolAbstraction._joinPool(_pair, $.WETH, 1e18, 1);

		Assert.isAtLeast(_shares, _estimatedShares.sub(5), "Shares received must be at least estimate - 10");
		Assert.isAtMost(_shares, _estimatedShares.add(5), "Shares received must be at most estimate + 10");

		Assert.equal(_getBalance(_pair), _shares, "Pair balance must match shares");
		Assert.equal(_getBalance($.AAVE), 0e18, "AAVE balance must be 0e18");
		Assert.isAtMost(_getBalance($.WETH), 5, "WETH balance must be at most 5");
		_burnAll($.WETH);

		uint256 _estimatedAmount = UniswapV2LiquidityPoolAbstraction._estimateExitPool(_pair, $.AAVE, _shares);
		uint256 _amount = UniswapV2LiquidityPoolAbstraction._exitPool(_pair, $.AAVE, _shares, 1);
		
		Assert.isAtLeast(_amount, _estimatedAmount.sub(5), "Amount received must be at least estimate - 10");
		Assert.isAtMost(_amount, _estimatedAmount.add(5), "Amount received must be at most estimate + 10");

		Assert.equal(_getBalance(_pair), 0e18, "Pair balance must be 0e18");
		Assert.equal(_getBalance($.AAVE), _amount, "AAVE balance must match amount");
		Assert.equal(_getBalance($.WETH), 0e18, "WETH balance must be 0e18");
	}
}
