// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.6.0;

import { WETH } from "../interop/WrappedEther.sol";

import { $ } from "../network/$.sol";

/**
 * @dev This library abstracts Wrapped Ether operations.
 */
library Wrapping
{
	/**
	 * @dev Sends some ETH to the Wrapped Ether contract in exchange for WETH.
	 * @param _amount The amount of ETH to be wrapped.
	 */
	function _wrap(uint256 _amount) internal
	{
		WETH($.WETH).deposit{value: _amount}();
	}

	/**
	 * @dev Receives some ETH from the Wrapped Ether contract in exchange for WETH.
	 *      Note that the contract using this library function must declare a
	 *      payable receive/fallback function.
	 * @param _amount The amount of ETH to be unwrapped.
	 */
	function _unwrap(uint256 _amount) internal
	{
		WETH($.WETH).withdraw(_amount);
	}
}
