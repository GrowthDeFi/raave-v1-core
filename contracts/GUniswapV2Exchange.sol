// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.6.0;

import { Router02 } from "./interop/UniswapV2.sol";
import { WETH } from "./interop/WrappedEther.sol";

import { $ } from "./network/$.sol";

contract GUniswapV2Exchange
{
	/* This method is only used by stress-test to easily mint any ERC-20
	 * supported by UniswapV2.
	 */
	function faucet(address _token, uint256 _amount) public payable {
		address payable _from = msg.sender;
		uint256 _value = msg.value;
		address _router = $.UniswapV2_ROUTER02;
		address _WETH = Router02(_router).WETH();
		uint256 _spent;
		if (_token == _WETH) {
			WETH(_token).deposit{value: _amount}();
			WETH(_token).transfer(_from, _amount);
			_spent = _amount;
		} else {
			address[] memory _path = new address[](2);
			_path[0] = _WETH;
			_path[1] = _token;
			_spent = Router02(_router).swapETHForExactTokens{value: _value}(_amount, _path, _from, block.timestamp)[0];
		}
		_from.transfer(_value - _spent);
	}
	receive() external payable {}
}
