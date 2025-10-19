// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract StakePool{
	mapping(address => uint256) public balances;
	mapping(address => uint256) public lockedBalances;

	uint256 public totalStaked = 0;
	address public owner;
	address public factCheckRegistry;

	uint256 public rewardPercentage = 10;

	event Deposit(address indexed user, uint256 amount);
	event Withdraw(address indexed user, uint256 amount);
    	event StakeLocked(address indexed user, uint256 amount);
    	event StakeUnlocked(address indexed user, uint256 amount);
    	event RewardClaimed(address indexed user, uint256 amount);
    	event PenaltyApplied(address indexed user, uint256 amount);
	
	modifier onlyOwner(){
        	require(msg.sender == owner, "Only owner");
        	_;
    	}
    
    	modifier onlyRegistry(){
        	require(msg.sender == factCheckRegistry, "Only FactCheckRegistry");
        	_;
    	}

	constructor(address _factCheckRegistry){
        	owner = msg.sender;
        	factCheckRegistry = _factCheckRegistry;
    	}
    
    	function deposit() external payable{
        	require(msg.value > 0, "Deposit amount must be > 0");
        	balances[msg.sender] += msg.value;
        	totalStaked += msg.value;
        	emit Deposit(msg.sender, msg.value);
    	}

	function withdraw(
		uint256 _amount
	) external{
		require(balances[msg.sender] >= _amount, "Insufficient balance");
        	require(lockedBalances[msg.sender] + _amount <= balances[msg.sender], "Cannot withdraw locked funds");
        
        	balances[msg.sender] -= _amount;
        	totalStaked -= _amount;
        
        	(bool success, ) = msg.sender.call{value: _amount}("");
        	require(success, "Withdrawal failed");
        
        	emit Withdraw(msg.sender, _amount);
	}

	function lockTokensForStake(
		address _user,
		uint256 _amount
	) external{
        	require(balances[_user] >= _amount, "Insufficient balance");
        	require(lockedBalances[_user] + _amount <= balances[_user], "Cannot lock already locked funds");
        
        	lockedBalances[_user] += _amount;
        	emit StakeLocked(_user, _amount);
    	}

	function unlockTokens(
		address _user, 
		uint256 _amount
	) external {
        	require(msg.sender == factCheckRegistry || msg.sender == owner, "Only FactCheckRegistry or owner");
        	require(lockedBalances[_user] >= _amount, "Invalid unlock amount");
        	lockedBalances[_user] -= _amount;
        	emit StakeUnlocked(_user, _amount);
    	}
    
    	function claimRewards(
		address _user, 
		uint256 _stakedAmount
	) external returns (uint256){
        	require(msg.sender == factCheckRegistry || msg.sender == owner, "Only FactCheckRegistry or owner");
       		uint256 reward = (_stakedAmount * rewardPercentage) / 100;
        	balances[_user] += reward;
        	emit RewardClaimed(_user, reward);
        	return reward;
    	}
    
    	function applyPenalty(
		address _user,
		uint256 _stakedAmount
	) external returns (uint256){
        	require(msg.sender == factCheckRegistry || msg.sender == owner, "Only FactCheckRegistry or owner");
        	uint256 penalty = (_stakedAmount * 5) / 100;
        
        	if(balances[_user] >= penalty){
            		balances[_user] -= penalty;
            		totalStaked -= penalty;
            		emit PenaltyApplied(_user, penalty);
            		return penalty;
        	}
        	return 0;
	}
    
    	function getBalance(
		address _user
	) external view returns (uint256){
        	return balances[_user];
    	}
    
    	function getAvailableBalance(
		address _user
	) external view returns (uint256){
        	return balances[_user] - lockedBalances[_user];
    	}
    
    	function getLockedBalance(
		address _user
	) external view returns (uint256){
        	return lockedBalances[_user];
    	}
    
    	function getTotalStaked() external view returns (uint256){
        	return totalStaked;
    	}
}
