// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.6.0;

import { GElasticToken } from "./GElasticToken.sol";
import { GLPMiningToken } from "./GLPMiningToken.sol";

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

contract stkAAVE_rAAVE is GLPMiningToken
{
	constructor (address _AAVE_rAAVE, address _rAAVE)
		GLPMiningToken("staked AAVE/rAAVE", "stkAAVE/rAAVE", 18, _AAVE_rAAVE, _rAAVE) public
	{
	}
}
