// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.6.0;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

import { Transfers } from "../contracts/modules/Transfers.sol";

import { Router02 } from "../contracts/interop/UniswapV2.sol";
import { WETH } from "../contracts/interop/WrappedEther.sol";

import { $ } from "../contracts/network/$.sol";

contract Env
{
	using SafeMath for uint256;

	uint256 public initialBalance = 8 ether;

	receive() external payable {}

	function _getBalance(address _token) internal view returns (uint256 _amount)
	{
		return Transfers._getBalance(_token);
	}

	function _mint(address _token, uint256 _amount) internal
	{
		address _router = $.UniswapV2_ROUTER02;
		address _WETH = Router02(_router).WETH();
		if (_token == _WETH) {
			WETH(_token).deposit{value: _amount}();
		} else {
			address[] memory _path = new address[](2);
			_path[0] = _WETH;
			_path[1] = _token;
			Router02(_router).swapETHForExactTokens{value: address(this).balance}(_amount, _path, address(this), block.timestamp);
		}
	}

	function _burn(address _token, uint256 _amount) internal
	{
		address _from = msg.sender;
		Transfers._pushFunds(_token, _from, _amount);
	}

	function _burnAll(address _token) internal
	{
		_burn(_token, _getBalance(_token));
	}
}
