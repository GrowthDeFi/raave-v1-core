// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.6.0;

import { GElasticToken } from "./GElasticToken.sol";
import { GLPMiningToken } from "./GLPMiningToken.sol";

import { Wrapping } from "./modules/Wrapping.sol";
import { UniswapV2LiquidityPoolAbstraction } from "./modules/UniswapV2LiquidityPoolAbstraction.sol";

import { $ } from "./network/$.sol";

/**
 * @notice Definition of rAAVE. It is an elastic supply token that uses AAVE
 * as reference token.
 */
contract rAAVE is GElasticToken
{
	constructor (uint256 _initialSupply)
		GElasticToken("rebase AAVE", "rAAVE", 18, $.AAVE, _initialSupply) public
	{
	}
}

/**
 * @notice Definition of stkAAVE/rAAVE. It provides mining or reward rAAVE when
 * providing liquidity to the AAVE/rAAVE pool.
 */
contract stkAAVE_rAAVE is GLPMiningToken
{
	constructor (address _AAVE_rAAVE, address _rAAVE)
		GLPMiningToken("staked AAVE/rAAVE", "stkAAVE/rAAVE", 18, _AAVE_rAAVE, _rAAVE) public
	{
	}
}

/**
 * @notice Definition of stkGRO/rAAVE. It provides mining or reward rAAVE when
 * providing liquidity to the GRO/rAAVE pool.
 */
contract stkGRO_rAAVE is GLPMiningToken
{
	constructor (address _GRO_rAAVE, address _rAAVE)
		GLPMiningToken("staked GRO/rAAVE", "stkGRO/rAAVE", 18, _GRO_rAAVE, _rAAVE) public
	{
	}
}

/**
 * @notice Definition of stkETH/rAAVE. It provides mining or reward rAAVE when
 * providing liquidity to the WETH/rAAVE pool.
 */
contract stkETH_rAAVE is GLPMiningToken
{
	constructor (address _ETH_rAAVE, address _rAAVE)
		GLPMiningToken("staked ETH/rAAVE", "stkETH/rAAVE", 18, _ETH_rAAVE, _rAAVE) public
	{
	}
}
