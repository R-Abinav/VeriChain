// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract FactCheckRegistry{
	enum Verdict { PENDING, TRUE, FALSE, UNCLEAR }

	struct FactCheck{
		uint256 id;
		string claim;
		string aiAnalysis;
		uint8 confidenceScore;
		Verdict verdict;
		address submittedBy;
		uint256 timestamp;
		uint256 stakesFor;
		uint256 stakesAgainst;
		bool finalized;
	}

	struct Stake{
		address staker;
		uint256 amount;
		bool supportVerdict;
		uint256 timestamp;
	}

	//State Variables
	mapping(uint256 => FactCheck) public factChecks;
	mapping(uint256 => Stake[]) public stakes;
	mapping(uint256 => mapping(address => uint256)) public userStakesOnClaim;

	uint256 public factCheckCount = 0;
	address public owner;

	event FactCheckSubmitted(
		uint256 indexed id,
		string claim,
		uint8 confidenceScore,
		address indexed submittedBy
	);

	event StakeAdded(
		uint256 indexed id,
		address indexed staker,
		uint256 amount,
		bool supportVerdict
	);

	event VerdictFinalized(
		uint256 indexed id,
		Verdict verdict,
		uint256 stakesFor,
		uint256 stakesAgainst
	);

	modifier onlyOwner(){
		require(msg.sender == owner, "Only owner");
		_;
	}

	constructor(){
		owner = msg.sender;
	}

	function submitFactCheck(
		string memory _claim, 
		string memory _aiAnalysis, 
		uint8 _confidenceScore
	) external returns (uint256){
		require(_confidenceScore <= 100, "Confidence must be 0-100");
		require(bytes(_claim).length > 0, "Claim cannot be empty");
		
		uint256 id = factCheckCount++;

		factChecks[id] = FactCheck({
			id: id,
			claim: _claim,
			aiAnalysis: _aiAnalysis,
			confidenceScore: _confidenceScore,
			verdict: Verdict.PENDING,
			submittedBy: msg.sender,
			timestamp: block.timestamp,
			stakesFor: 0,
			stakesAgainst: 0,
			finalized: false
		});

		emit FactCheckSubmitted(id, _claim, _confidenceScore, msg.sender);
		return id;
	}

	function addStake(
		uint256 _id, 
		bool _supportVerdict,
		uint256 _amount
	) external {
		require(_id < factCheckCount, "Invalid fact check ID");
		require(!factChecks[_id].finalized, "Fact check already finalized");
		require(_amount > 0, "Stake amount must be greater than 0");
		require(msg.sender != factChecks[_id].submittedBy, "Cannot stake on your own claim");

		stakes[_id].push(Stake({
			staker: msg.sender,
			amount: _amount,
			supportVerdict: _supportVerdict,
			timestamp: block.timestamp
		}));

		userStakesOnClaim[_id][msg.sender] += _amount;

		if(_supportVerdict){
			factChecks[_id].stakesFor += _amount;
		}else{
			factChecks[_id].stakesAgainst += _amount;
		}

		emit StakeAdded(_id, msg.sender, _amount, _supportVerdict);
	}

	function finalizeVerdict(
		uint256 _id
	) external onlyOwner {
		require(_id < factCheckCount, "Invalid Fact Check ID!");
		require(!factChecks[_id].finalized, "Already Finalized");

		FactCheck storage check = factChecks[_id];
		uint8 thresholdValueForAi = 70;

		bool communityVotesTRUE = check.stakesFor > check.stakesAgainst;
		bool aiVotesTRUE = check.confidenceScore >= thresholdValueForAi;
		
		//Check if stakes are close (within 20% difference)
		uint256 totalStakes = check.stakesFor + check.stakesAgainst;
		bool stakesAreClose = totalStakes > 0 && 
			(check.stakesFor * 100 / totalStakes > 40 && check.stakesFor * 100 / totalStakes < 60);
		
		//TRUE: AI confident AND community votes TRUE AND stakes not close
		if(aiVotesTRUE && communityVotesTRUE && !stakesAreClose){
			check.verdict = Verdict.TRUE;
		}
		//FALSE: AI not confident AND community votes FALSE AND stakes not close
		else if(!aiVotesTRUE && !communityVotesTRUE && !stakesAreClose){
			check.verdict = Verdict.FALSE;
		}
		//UNCLEAR: Close stakes OR conflicting AI/community signals
		else{
			check.verdict = Verdict.UNCLEAR;
		}

		check.finalized = true;
		emit VerdictFinalized(_id, check.verdict, check.stakesFor, check.stakesAgainst);
	}

	function getFactCheck(
		uint256 _id
	) external view returns (FactCheck memory){
		require(_id < factCheckCount, "Invalid Fact Check ID");
		return factChecks[_id];
	} 

	function getStakes(
		uint256 _id
	) external view returns (Stake[] memory){
		return stakes[_id];
	}

	function getStakesCount(
		uint256 _id
	) external view returns (uint256){
		return stakes[_id].length;
	}

	function getUserStakeOnClaim(
		uint256 _id, 
		address _user
	) external view returns (uint256){
		return userStakesOnClaim[_id][_user];
	}

	function getTotalFactChecks() external view returns (uint256){
		return factCheckCount;
	}
}