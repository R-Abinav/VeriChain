import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Use any type for contracts until TypeChain types are generated
type Contract = any;

describe("VeriChain - Complete Test Suite", () => {
  let registry: Contract;
  let stakePool: Contract;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let charlie: SignerWithAddress;

  beforeEach(async () => {
    // Get signers
    [owner, alice, bob, charlie] = await hre.ethers.getSigners();

    // Deploy FactCheckRegistry
    const FactCheckRegistry = await hre.ethers.getContractFactory("FactCheckRegistry");
    registry = await FactCheckRegistry.deploy();

    // Deploy StakePool
    const StakePool = await hre.ethers.getContractFactory("StakePool");
    stakePool = await StakePool.deploy(await registry.getAddress());
  });

  describe("FactCheckRegistry - Basic Functions", () => {
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

    it("Should track submittedBy correctly", async () => {
      const claim = "Bitcoin was created in 2009";
      await registry.connect(alice).submitFactCheck(claim, "AI analysis", 92);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.submittedBy).to.equal(alice.address);
    });
  });

  describe("FactCheckRegistry - Staking with Anti-Sybil Protection", () => {
    it("Should prevent user from staking on their own claim", async () => {
      // Alice submits a claim
      await registry.connect(alice).submitFactCheck(
        "Bitcoin was created in 2009",
        "AI analysis",
        92
      );

      // Alice tries to stake on her own claim - should fail
      await expect(
        registry.connect(alice).addStake(0, true, ethers.parseEther("1"))
      ).to.be.revertedWith("Cannot stake on your own claim");
    });

    it("Should allow other users to stake on the claim", async () => {
      // Alice submits
      await registry.connect(alice).submitFactCheck("Claim", "Analysis", 90);

      // Bob stakes for TRUE
      await registry.connect(bob).addStake(0, true, ethers.parseEther("10"));

      // Charlie stakes for FALSE
      await registry.connect(charlie).addStake(0, false, ethers.parseEther("5"));

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.stakesFor).to.equal(ethers.parseEther("10"));
      expect(factCheck.stakesAgainst).to.equal(ethers.parseEther("5"));
    });

    it("Should track multiple stakes from different users", async () => {
      await registry.connect(alice).submitFactCheck("Claim", "Analysis", 75);

      // Bob stakes twice
      await registry.connect(bob).addStake(0, true, ethers.parseEther("5"));
      await registry.connect(bob).addStake(0, true, ethers.parseEther("3"));

      const userStake = await registry.getUserStakeOnClaim(0, bob.address);
      expect(userStake).to.equal(ethers.parseEther("8"));

      const stakes = await registry.getStakes(0);
      expect(stakes.length).to.equal(2);
    });

    it("Should not allow staking on finalized claims", async () => {
      await registry.submitFactCheck("Test claim", "Test analysis", 75);
      await registry.finalizeVerdict(0);

      await expect(
        registry.connect(alice).addStake(0, true, ethers.parseEther("5"))
      ).to.be.revertedWith("Fact check already finalized");
    });

    it("Should reject zero stake amount", async () => {
      await registry.connect(alice).submitFactCheck("Claim", "Analysis", 50);

      await expect(
        registry.connect(bob).addStake(0, true, ethers.parseEther("0"))
      ).to.be.revertedWith("Stake amount must be greater than 0");
    });
  });

  describe("FactCheckRegistry - Verdict Finalization", () => {
    it("Should finalize verdict: TRUE (AI high confidence + community votes TRUE)", async () => {
      await registry.submitFactCheck("Claim", "Analysis", 90);

      await registry.connect(alice).addStake(0, true, ethers.parseEther("100"));
      await registry.connect(bob).addStake(0, false, ethers.parseEther("10"));

      await registry.finalizeVerdict(0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.verdict).to.equal(1); // TRUE
      expect(factCheck.finalized).to.be.true;
    });

    it("Should finalize verdict: FALSE (AI low confidence + community votes FALSE)", async () => {
      await registry.submitFactCheck("Claim", "Analysis", 40);

      await registry.connect(alice).addStake(0, true, ethers.parseEther("10"));
      await registry.connect(bob).addStake(0, false, ethers.parseEther("100"));

      await registry.finalizeVerdict(0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.verdict).to.equal(2); // FALSE
      expect(factCheck.finalized).to.be.true;
    });

    it("Should finalize verdict: UNCLEAR (conflicting signals)", async () => {
      await registry.submitFactCheck("Claim", "Analysis", 60);

      await registry.connect(alice).addStake(0, true, ethers.parseEther("50"));
      await registry.connect(bob).addStake(0, false, ethers.parseEther("60"));

      await registry.finalizeVerdict(0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.verdict).to.equal(3); // UNCLEAR
      expect(factCheck.finalized).to.be.true;
    });

    it("Should finalize verdict: UNCLEAR (stakes too close)", async () => {
      // Stakes are close (45% vs 55%)
      await registry.submitFactCheck("Claim", "Analysis", 90); // AI confident

      await registry.connect(alice).addStake(0, true, ethers.parseEther("45"));
      await registry.connect(bob).addStake(0, false, ethers.parseEther("55"));

      await registry.finalizeVerdict(0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.verdict).to.equal(3); // UNCLEAR because stakes too close
    });

    it("Should only allow owner to finalize", async () => {
      await registry.submitFactCheck("Claim", "Analysis", 75);

      await expect(
        registry.connect(alice).finalizeVerdict(0)
      ).to.be.revertedWith("Only owner");
    });

    it("Should prevent double finalization", async () => {
      await registry.submitFactCheck("Claim", "Analysis", 75);
      await registry.finalizeVerdict(0);

      await expect(
        registry.finalizeVerdict(0)
      ).to.be.revertedWith("Already Finalized");
    });
  });

  describe("StakePool - Deposit & Withdrawal", () => {
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

    it("Should track available and locked balances correctly", async () => {
      const depositAmount = ethers.parseEther("5");
      const lockAmount = ethers.parseEther("3");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.lockTokensForStake(alice.address, lockAmount);

      const locked = await stakePool.getLockedBalance(alice.address);
      const available = await stakePool.getAvailableBalance(alice.address);

      expect(locked).to.equal(lockAmount);
      expect(available).to.equal(depositAmount - lockAmount);
    });
  });

  describe("StakePool - Token Locking & Unlocking", () => {
    it("Should lock tokens for staking", async () => {
      const depositAmount = ethers.parseEther("5");
      const lockAmount = ethers.parseEther("3");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.lockTokensForStake(alice.address, lockAmount);

      const locked = await stakePool.getLockedBalance(alice.address);
      expect(locked).to.equal(lockAmount);
    });

    it("Should unlock tokens after voting", async () => {
      const depositAmount = ethers.parseEther("5");
      const lockAmount = ethers.parseEther("3");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.lockTokensForStake(alice.address, lockAmount);

      await stakePool.unlockTokens(alice.address, lockAmount);

      const locked = await stakePool.getLockedBalance(alice.address);
      expect(locked).to.equal(0);
    });

    it("Should not allow locking more than balance", async () => {
      const depositAmount = ethers.parseEther("5");
      const lockAmount = ethers.parseEther("10");

      await stakePool.connect(alice).deposit({ value: depositAmount });

      await expect(
        stakePool.lockTokensForStake(alice.address, lockAmount)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("StakePool - Rewards & Penalties", () => {
    it("Should claim rewards for correct stakes", async () => {
      const depositAmount = ethers.parseEther("100");
      const stakedAmount = ethers.parseEther("10");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.claimRewards(alice.address, stakedAmount);

      const balance = await stakePool.getBalance(alice.address);
      const expectedReward = stakedAmount / BigInt(10); // 10% reward
      expect(balance).to.equal(depositAmount + expectedReward);
    });

    it("Should apply penalties for incorrect stakes", async () => {
      const depositAmount = ethers.parseEther("100");
      const stakedAmount = ethers.parseEther("10");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.applyPenalty(alice.address, stakedAmount);

      const balance = await stakePool.getBalance(alice.address);
      const expectedPenalty = (stakedAmount * BigInt(5)) / BigInt(100); // 5% penalty
      expect(balance).to.equal(depositAmount - expectedPenalty);
    });

    it("Should handle multiple reward claims", async () => {
      const depositAmount = ethers.parseEther("100");
      const stake1 = ethers.parseEther("10");
      const stake2 = ethers.parseEther("20");

      await stakePool.connect(alice).deposit({ value: depositAmount });
      await stakePool.claimRewards(alice.address, stake1);
      await stakePool.claimRewards(alice.address, stake2);

      const balance = await stakePool.getBalance(alice.address);
      const totalReward = (stake1 + stake2) / BigInt(10);
      expect(balance).to.equal(depositAmount + totalReward);
    });
  });

  describe("Integration Tests - Complete Workflow", () => {
    it("End-to-end: Multi-user voting scenario", async () => {
      // 1. Alice submits claim
      await registry.connect(alice).submitFactCheck(
        "Bitcoin was created in 2009",
        "Verified through multiple blockchain sources",
        92
      );

      // 2. Bob and Charlie deposit to pool
      await stakePool.connect(bob).deposit({ value: ethers.parseEther("20") });
      await stakePool.connect(charlie).deposit({ value: ethers.parseEther("15") });

      // 3. Bob stakes for TRUE
      await registry.connect(bob).addStake(0, true, ethers.parseEther("10"));

      // 4. Charlie stakes for FALSE (disputes)
      await registry.connect(charlie).addStake(0, false, ethers.parseEther("5"));

      // 5. Bob adds another stake to support
      await registry.connect(bob).addStake(0, true, ethers.parseEther("7"));

      // 6. Verify stakes
      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.stakesFor).to.equal(ethers.parseEther("17")); // 10 + 7
      expect(factCheck.stakesAgainst).to.equal(ethers.parseEther("5"));

      // 7. Finalize verdict (should be TRUE: AI 92% + community 17 > 5)
      await registry.finalizeVerdict(0);

      const finalCheck = await registry.getFactCheck(0);
      expect(finalCheck.verdict).to.equal(1); // TRUE
      expect(finalCheck.finalized).to.be.true;

      console.log("✅ Multi-user voting scenario complete!");
    });

    it("Should handle multiple claims with different outcomes", async () => {
      // Claim 1: Bitcoin 2009
      await registry.connect(alice).submitFactCheck("Bitcoin 2009", "Analysis", 92);

      // Claim 2: Ethereum PoW (FALSE)
      await registry.connect(bob).submitFactCheck("Ethereum uses PoW", "Analysis", 30);

      // Stakes on Claim 1 (TRUE)
      await registry.connect(bob).addStake(0, true, ethers.parseEther("100"));
      await registry.connect(charlie).addStake(0, false, ethers.parseEther("10"));

      // Stakes on Claim 2 (FALSE)
      await registry.connect(alice).addStake(1, true, ethers.parseEther("10"));
      await registry.connect(charlie).addStake(1, false, ethers.parseEther("100"));

      // Finalize both
      await registry.finalizeVerdict(0);
      await registry.finalizeVerdict(1);

      const claim1 = await registry.getFactCheck(0);
      const claim2 = await registry.getFactCheck(1);

      expect(claim1.verdict).to.equal(1); // TRUE
      expect(claim2.verdict).to.equal(2); // FALSE

      console.log("✅ Multiple claims with different outcomes verified!");
    });

    it("Should prevent creator from manipulating votes", async () => {
      // Alice submits claim
      await registry.connect(alice).submitFactCheck("Claim", "Analysis", 50);

      // Alice tries to stake on her own claim - fails
      await expect(
        registry.connect(alice).addStake(0, true, ethers.parseEther("1000"))
      ).to.be.revertedWith("Cannot stake on your own claim");

      // Only Bob and Charlie can vote
      await registry.connect(bob).addStake(0, true, ethers.parseEther("10"));
      await registry.connect(charlie).addStake(0, false, ethers.parseEther("5"));

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.stakesFor).to.equal(ethers.parseEther("10"));
      expect(factCheck.stakesAgainst).to.equal(ethers.parseEther("5"));

      console.log("✅ Anti-manipulation protection verified!");
    });
  });

  describe("Edge Cases & Security", () => {
    it("Should handle very high confidence scores", async () => {
      await registry.submitFactCheck("Claim", "Analysis", 100);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.confidenceScore).to.equal(100);
    });

    it("Should handle very low confidence scores", async () => {
      await registry.submitFactCheck("Claim", "Analysis", 0);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.confidenceScore).to.equal(0);
    });

    it("Should handle large stake amounts", async () => {
      await registry.connect(alice).submitFactCheck("Claim", "Analysis", 80);

      const largeStake = ethers.parseEther("1000000");
      await registry.connect(bob).addStake(0, true, largeStake);

      const factCheck = await registry.getFactCheck(0);
      expect(factCheck.stakesFor).to.equal(largeStake);
    });

    it("Should track stake count correctly", async () => {
      await registry.connect(alice).submitFactCheck("Claim", "Analysis", 50);

      await registry.connect(bob).addStake(0, true, ethers.parseEther("1"));
      await registry.connect(charlie).addStake(0, false, ethers.parseEther("1"));
      await registry.connect(owner).addStake(0, true, ethers.parseEther("1"));

      const stakesCount = await registry.getStakesCount(0);
      expect(stakesCount).to.equal(3);
    });

    it("Should return 0 for getTotalFactChecks when empty", async () => {
      const count = await registry.getTotalFactChecks();
      expect(count).to.equal(0);
    });

    it("Should return correct getTotalFactChecks after submissions", async () => {
      await registry.connect(alice).submitFactCheck("Claim 1", "Analysis", 50);
      await registry.connect(bob).submitFactCheck("Claim 2", "Analysis", 75);
      await registry.connect(charlie).submitFactCheck("Claim 3", "Analysis", 90);

      const count = await registry.getTotalFactChecks();
      expect(count).to.equal(3);
    });
  });
});