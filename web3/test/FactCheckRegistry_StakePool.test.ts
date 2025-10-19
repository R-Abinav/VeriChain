import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Use any type for contracts until TypeChain types are generated
type Contract = any;

describe("VeriChain", () => {
  let registry: Contract;
  let stakePool: Contract;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  beforeEach(async () => {
    // Get signers
    [owner, alice, bob] = await hre.ethers.getSigners();

    // Deploy FactCheckRegistry
    const FactCheckRegistry = await hre.ethers.getContractFactory("FactCheckRegistry");
    registry = await FactCheckRegistry.deploy();

    // Deploy StakePool
    const StakePool = await hre.ethers.getContractFactory("StakePool");
    stakePool = await StakePool.deploy(await registry.getAddress());
  });

  describe("FactCheckRegistry", () => {
    it("Should submit a fact check", async () => {
      const claim = "The Earth is flat";
      const analysis = "AI says: This is FALSE based on 1000+ sources";
      const confidence = 95;

      const tx = await registry.submitFactCheck(claim, analysis, confidence);
      const receipt = await tx.wait();

      // Check event was emitted
      expect(receipt?.logs.length).to.be.greaterThan(0);

      // Check fact check was stored
      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.claim).to.equal(claim);
      expect(factCheck.aiAnalysis).to.equal(analysis);
      expect(factCheck.confidenceScore).to.equal(confidence);
      expect(factCheck.verdict).to.equal(0); // PENDING
      expect(factCheck.finalized).to.be.false;
    });

    it("Should reject invalid confidence scores", async () => {
      await expect(
        registry.submitFactCheck("Test", "Test analysis", 101)
      ).to.be.revertedWith("Confidence must be 0-100");
    });

    it("Should reject empty claims", async () => {
      await expect(
        registry.submitFactCheck("", "Test analysis", 50)
      ).to.be.revertedWith("Claim cannot be empty");
    });

    it("Should add stakes to a fact check", async () => {
      // Submit a claim
      await registry.submitFactCheck("Biden won 2020", "AI analysis", 90);

      // Alice stakes 10 for TRUE
      await registry.connect(alice).addStake(0, true, ethers.parseEther("10"));

      // Bob stakes 5 for FALSE
      await registry.connect(bob).addStake(0, false, ethers.parseEther("5"));

      // Check fact check was updated
      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.stakesFor).to.equal(ethers.parseEther("10"));
      expect(factCheck.stakesAgainst).to.equal(ethers.parseEther("5"));

      // Check user stakes were recorded
      const aliceStake = await registry.getUserStakeOnClaim(0, alice.address);
      expect(aliceStake).to.equal(ethers.parseEther("10"));

      // Check stakes array
      const stakes = await registry.getStakes(0);
      expect(stakes.length).to.equal(2);
      expect(stakes[0].staker).to.equal(alice.address);
      expect(stakes[0].supportVerdict).to.be.true;
      expect(stakes[1].staker).to.equal(bob.address);
      expect(stakes[1].supportVerdict).to.be.false;
    });

    it("Should not allow staking on finalized claims", async () => {
      // Submit and finalize
      await registry.submitFactCheck("Test claim", "Test analysis", 75);
      await registry.finalizeVerdict(0);

      // Try to stake (should fail)
      await expect(
        registry.connect(alice).addStake(0, true, ethers.parseEther("5"))
      ).to.be.revertedWith("Fact check already finalized");
    });

    it("Should finalize verdict: TRUE (AI high confidence + community votes TRUE)", async () => {
      // Submit claim with 90% confidence
      await registry.submitFactCheck("Claim", "Analysis", 90);

      // Alice stakes 100 for TRUE
      await registry.connect(alice).addStake(0, true, ethers.parseEther("100"));
      // Bob stakes 10 for FALSE
      await registry.connect(bob).addStake(0, false, ethers.parseEther("10"));

      // Finalize
      await registry.finalizeVerdict(0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.verdict).to.equal(1); // TRUE
      expect(factCheck.finalized).to.be.true;
    });

    it("Should finalize verdict: FALSE (AI low confidence + community votes FALSE)", async () => {
      // Submit claim with 40% confidence
      await registry.submitFactCheck("Claim", "Analysis", 40);

      // Alice stakes 10 for TRUE
      await registry.connect(alice).addStake(0, true, ethers.parseEther("10"));
      // Bob stakes 100 for FALSE
      await registry.connect(bob).addStake(0, false, ethers.parseEther("100"));

      // Finalize
      await registry.finalizeVerdict(0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.verdict).to.equal(2); // FALSE
      expect(factCheck.finalized).to.be.true;
    });

    it("Should finalize verdict: UNCLEAR (conflicting signals)", async () => {
      // Submit claim with 60% confidence (borderline)
      await registry.submitFactCheck("Claim", "Analysis", 60);

      // Alice stakes 50 for TRUE
      await registry.connect(alice).addStake(0, true, ethers.parseEther("50"));
      // Bob stakes 60 for FALSE (more stakes for FALSE)
      await registry.connect(bob).addStake(0, false, ethers.parseEther("60"));

      // Finalize
      await registry.finalizeVerdict(0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.verdict).to.equal(3); // UNCLEAR
      expect(factCheck.finalized).to.be.true;
    });

    it("Should only allow owner to finalize", async () => {
      await registry.submitFactCheck("Claim", "Analysis", 75);

      await expect(
        registry.connect(alice).finalizeVerdict(0)
      ).to.be.revertedWith("Only owner");
    });
  });

  describe("StakePool", () => {
    it("Should allow users to deposit ETH", async () => {
      const depositAmount = ethers.parseEther("5");

      await stakePool.connect(alice).deposit({ value: depositAmount });

      const balance = await stakePool.getBalance(alice.address);
      expect(balance).to.equal(depositAmount);
    });

    it("Should reject zero deposits", async () => {
      await expect(
        stakePool.connect(alice).deposit({ value: 0 })
      ).to.be.revertedWith("Deposit amount must be > 0");
    });

    it("Should allow users to withdraw", async () => {
      const depositAmount = ethers.parseEther("5");
      const withdrawAmount = ethers.parseEther("3");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.connect(alice).withdraw(withdrawAmount);

      const balance = await stakePool.getBalance(alice.address);
      expect(balance).to.equal(depositAmount - withdrawAmount);
    });

    it("Should not allow withdrawal of locked funds", async () => {
      const depositAmount = ethers.parseEther("5");
      const lockAmount = ethers.parseEther("3");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.lockTokensForStake(alice.address, lockAmount);

      await expect(
        stakePool.connect(alice).withdraw(depositAmount)
      ).to.be.revertedWith("Cannot withdraw locked funds");
    });

    it("Should lock tokens for staking", async () => {
      const depositAmount = ethers.parseEther("5");
      const lockAmount = ethers.parseEther("3");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.lockTokensForStake(alice.address, lockAmount);

      const locked = await stakePool.getLockedBalance(alice.address);
      const available = await stakePool.getAvailableBalance(alice.address);

      expect(locked).to.equal(lockAmount);
      expect(available).to.equal(depositAmount - lockAmount);
    });

    it("Should unlock tokens", async () => {
      const depositAmount = ethers.parseEther("5");
      const lockAmount = ethers.parseEther("3");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.lockTokensForStake(alice.address, lockAmount);

      // Unlock (only registry can call this normally, but owner can too for testing)
      await stakePool.unlockTokens(alice.address, lockAmount);

      const locked = await stakePool.getLockedBalance(alice.address);
      expect(locked).to.equal(0);
    });

    it("Should claim rewards", async () => {
      const depositAmount = ethers.parseEther("100");
      const stakedAmount = ethers.parseEther("10");

      await stakePool.connect(alice).deposit({ value: depositAmount });

      // Mock reward claim (normally called by registry)
      await stakePool.claimRewards(alice.address, stakedAmount);

      const balance = await stakePool.getBalance(alice.address);
      const expectedReward = stakedAmount / BigInt(10); // 10% reward
      expect(balance).to.equal(depositAmount + expectedReward);
    });

    it("Should apply penalty", async () => {
      const depositAmount = ethers.parseEther("100");
      const stakedAmount = ethers.parseEther("10");

      await stakePool.connect(alice).deposit({ value: depositAmount });

      // Mock penalty application (normally called by registry)
      await stakePool.applyPenalty(alice.address, stakedAmount);

      const balance = await stakePool.getBalance(alice.address);
      const expectedPenalty = (stakedAmount * BigInt(5)) / BigInt(100); // 5% penalty
      expect(balance).to.equal(depositAmount - expectedPenalty);
    });
  });

  describe("Integration Tests", () => {
    it("End-to-end: Submit claim -> Stake -> Finalize -> Reward", async () => {
      // 1. Submit claim
      await registry.submitFactCheck("Test claim", "AI analysis", 85);

      // 2. Users deposit to stakepool
      await stakePool.connect(alice).deposit({ value: ethers.parseEther("20") });
      await stakePool.connect(bob).deposit({ value: ethers.parseEther("15") });

      // 3. Users stake
      await registry.connect(alice).addStake(0, true, ethers.parseEther("10"));
      await registry.connect(bob).addStake(0, false, ethers.parseEther("5"));

      // 4. Finalize (should be TRUE: AI 85% confident + community votes TRUE)
      await registry.finalizeVerdict(0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.verdict).to.equal(1); // TRUE

      // 5. Verify stakes
      expect(factCheck.stakesFor).to.equal(ethers.parseEther("10"));
      expect(factCheck.stakesAgainst).to.equal(ethers.parseEther("5"));

      console.log("✅ Full workflow successful!");
    });
  });
});