// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.6.0;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { ElasticERC20 } from "./ElasticERC20.sol";
import { Executor } from "./Executor.sol";
import { GElastic } from "./GElastic.sol";
import { GElasticTokenManager } from "./GElasticTokenManager.sol";
import { GPriceOracle } from "./GPriceOracle.sol";

import { Math } from "./modules/Math.sol";

import { Pair } from "./interop/UniswapV2.sol";

/**
 * @notice This contract implements an ERC20 compatible elastic token that
 * rebases according to the TWAP of another token. Inspired by AMPL and YAM.
 */
contract GElasticToken is ElasticERC20, Ownable, ReentrancyGuard, GElastic
{
	using SafeMath for uint256;
	using GElasticTokenManager for GElasticTokenManager.Self;
	using GPriceOracle for GPriceOracle.Self;
	using Executor for Executor.Target[];

	address public immutable override referenceToken;

	GElasticTokenManager.Self etm;
	GPriceOracle.Self oracle;

	Executor.Target[] public targets;

	modifier onlyEOA()
	{
		require(tx.origin == _msgSender(), "not an externally owned account");
		_;
	}

	constructor (string memory _name, string memory _symbol, uint8 _decimals, address _referenceToken, uint256 _initialSupply)
		ElasticERC20(_name, _symbol) public
	{
		address _treasury = msg.sender;
		_setupDecimals(_decimals);
		assert(_referenceToken != address(0));
		referenceToken = _referenceToken;
		etm.init(_treasury);
		oracle.init();
		_mint(_treasury, _initialSupply);
	}

	function treasury() external view override returns (address _treasury)
	{
		return etm.treasury;
	}

	function rebaseMinimumDeviation() external view override returns (uint256 _rebaseMinimumDeviation)
	{
		return etm.rebaseMinimumDeviation;
	}

	function rebaseDampeningFactor() external view override returns (uint256 _rebaseDampeningFactor)
	{
		return etm.rebaseDampeningFactor;
	}

	function rebaseTreasuryMintPercent() external view override returns (uint256 _rebaseTreasuryMintPercent)
	{
		return etm.rebaseTreasuryMintPercent;
	}

	function rebaseTimingParameters() external view override returns (uint256 _rebaseMinimumInterval, uint256 _rebaseWindowOffset, uint256 _rebaseWindowLength)
	{
		return (etm.rebaseMinimumInterval, etm.rebaseWindowOffset, etm.rebaseWindowLength);
	}

	function rebaseAvailable() external view override returns (bool _rebaseAvailable)
	{
		return etm.rebaseAvailable();
	}

	function rebaseActive() external view override returns (bool _rebaseActive)
	{
		return etm.rebaseActive;
	}

	function lastRebaseTime() external view override returns (uint256 _lastRebaseTime)
	{
		return etm.lastRebaseTime;
	}

	function epoch() external view override returns (uint256 _epoch)
	{
		return etm.epoch;
	}

	function lastExchangeRate() external view override returns (uint256 _exchangeRate)
	{
		return oracle.consultLastPrice(10 ** uint256(decimals()));
	}

	function currentExchangeRate() external view override returns (uint256 _exchangeRate)
	{
		return oracle.consultCurrentPrice(10 ** uint256(decimals()));
	}

	function pair() external view override returns (address _pair)
	{
		return oracle.pair;
	}

	function rebase() external override onlyEOA nonReentrant
	{
		oracle.updatePrice();

		uint256 _exchangeRate = oracle.consultLastPrice(10 ** uint256(decimals()));

		uint256 _totalSupply = totalSupply();

		(uint256 _delta, bool _positive, uint256 _mintAmount) = etm.rebase(_exchangeRate, _totalSupply);

		_rebase(etm.epoch, _delta, _positive);

		if (_mintAmount > 0) {
			_mint(etm.treasury, _mintAmount);
		}

		// updates cached reserve balances wherever necessary
		Pair(oracle.pair).sync();
		targets.executeAll();
	}

	function activateOracle(address _pair) external override onlyOwner nonReentrant
	{
		address _token0 = Pair(_pair).token0();
		address _token1 = Pair(_pair).token1();
		require(_token0 == address(this) && _token1 == referenceToken || _token1 == address(this) && _token0 == referenceToken, "invalid pair");
		oracle.activate(_pair, _token0 == address(this));
	}

	function activateRebase() external override onlyOwner nonReentrant
	{
		require(oracle.active(), "not available");
		etm.activateRebase();
	}

	function setTreasury(address _newTreasury) external override onlyOwner nonReentrant
	{
		address _oldTreasury = etm.treasury;
		etm.setTreasury(_newTreasury);
		emit ChangeTreasury(_oldTreasury, _newTreasury);
	}

	function setRebaseMinimumDeviation(uint256 _newRebaseMinimumDeviation) external override onlyOwner nonReentrant
	{
		uint256 _oldRebaseMinimumDeviation = etm.rebaseMinimumDeviation;
		etm.setRebaseMinimumDeviation(_newRebaseMinimumDeviation);
		emit ChangeRebaseMinimumDeviation(_oldRebaseMinimumDeviation, _newRebaseMinimumDeviation);
	}

	function setRebaseDampeningFactor(uint256 _newRebaseDampeningFactor) external override onlyOwner nonReentrant
	{
		uint256 _oldRebaseDampeningFactor = etm.rebaseDampeningFactor;
		etm.setRebaseDampeningFactor(_newRebaseDampeningFactor);
		emit ChangeRebaseDampeningFactor(_oldRebaseDampeningFactor, _newRebaseDampeningFactor);
	}

	function setRebaseTreasuryMintPercent(uint256 _newRebaseTreasuryMintPercent) external override onlyOwner nonReentrant
	{
		uint256 _oldRebaseTreasuryMintPercent = etm.rebaseTreasuryMintPercent;
		etm.setRebaseTreasuryMintPercent(_newRebaseTreasuryMintPercent);
		emit ChangeRebaseTreasuryMintPercent(_oldRebaseTreasuryMintPercent, _newRebaseTreasuryMintPercent);
	}

	function setRebaseTimingParameters(uint256 _newRebaseMinimumInterval, uint256 _newRebaseWindowOffset, uint256 _newRebaseWindowLength) external override onlyOwner nonReentrant
	{
		uint256 _oldRebaseMinimumInterval = etm.rebaseMinimumInterval;
		uint256 _oldRebaseWindowOffset = etm.rebaseWindowOffset;
		uint256 _oldRebaseWindowLength = etm.rebaseWindowLength;
		etm.setRebaseTimingParameters(_newRebaseMinimumInterval, _newRebaseWindowOffset, _newRebaseWindowLength);
		oracle.changeMinimumInterval(_newRebaseMinimumInterval.sub(_newRebaseWindowLength));
		emit ChangeRebaseTimingParameters(_oldRebaseMinimumInterval, _oldRebaseWindowOffset, _oldRebaseWindowLength, _newRebaseMinimumInterval, _newRebaseWindowOffset, _newRebaseWindowLength);
	}

	function addPostRebaseTarget(address _to, bytes memory _data) external override onlyOwner nonReentrant
	{
		_addPostRebaseTarget(_to, _data);
	}

	function removePostRebaseTarget(uint256 _index) external override onlyOwner nonReentrant
	{
		_removePostRebaseTarget(_index);
	}

	function addBalancerPostRebaseTarget(address _pool) external onlyOwner nonReentrant
	{
		_addPostRebaseTarget(_pool, abi.encodeWithSignature("gulp(address)", address(this)));
	}

	function addUniswapV2PostRebaseTarget(address _pair) external onlyOwner nonReentrant
	{
		_addPostRebaseTarget(_pair, abi.encodeWithSignature("sync()"));
	}

	function _addPostRebaseTarget(address _to, bytes memory _data) internal
	{
		targets.addTarget(_to, _data);
		emit AddPostRebaseTarget(_to, _data);
	}

	function _removePostRebaseTarget(uint256 _index) internal
	{
		Executor.Target storage _target = targets[_index];
		address _to = _target.to;
		bytes memory _data = _target.data;
		targets.removeTarget(_index);
		emit RemovePostRebaseTarget(_to, _data);
	}

	function _rebase(uint256 _epoch, uint256 _delta, bool _positive) internal virtual
	{
		uint256 _oldScalingFactor = scalingFactor();
		uint256 _newScalingFactor;
		if (_delta == 0) {
			_newScalingFactor = _oldScalingFactor;
		} else {
			if (_positive) {
				_newScalingFactor = _oldScalingFactor.mul(uint256(1e18).add(_delta)).div(1e18);
			} else {
				_newScalingFactor = _oldScalingFactor.mul(uint256(1e18).sub(_delta)).div(1e18);
			}
		}
		if (_newScalingFactor > _oldScalingFactor) {
			_newScalingFactor = Math._min(_newScalingFactor, maxScalingFactor());
		}
		_setScalingFactor(_newScalingFactor);
		emit Rebase(_epoch, _oldScalingFactor, _newScalingFactor);
	}
}
