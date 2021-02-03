// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.6.0;

import { GLPMining } from "./GLPMining.sol";

import { Transfers } from "./modules/Transfers.sol";
import { Wrapping } from "./modules/Wrapping.sol";

import { $ } from "./network/$.sol";

contract GEtherBridge
{
	function deposit(address _stakeToken, uint256 _minShares) external payable
	{
		address _from = msg.sender;
		uint256 _amount = msg.value;
		address _token = $.WETH;
		Wrapping._wrap(_amount);
		Transfers._approveFunds(_token, _stakeToken, _amount);
		GLPMining(_stakeToken).depositToken(_token, _amount, _minShares);
		uint256 _shares = Transfers._getBalance(_stakeToken);
		Transfers._pushFunds(_stakeToken, _from, _shares);
	}

	function withdraw(address _stakeToken, uint256 _shares, uint256 _minAmount) external
	{
		address payable _from = msg.sender;
		address _token = $.WETH;
		Transfers._pullFunds(_stakeToken, _from, _shares);
		GLPMining(_stakeToken).withdrawToken(_token, _shares, _minAmount);
		uint256 _amount = Transfers._getBalance(_token);
		Wrapping._unwrap(_amount);
		_from.transfer(_amount);
	}

	receive() external payable {} // not to be used directly
}
