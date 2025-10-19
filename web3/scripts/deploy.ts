import { ethers } from "ethers";
import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying FactCheckDAO to Sepolia...\n");

  // Deploy FactCheckRegistry
  console.log("📝 Deploying FactCheckRegistry...");
  const FactCheckRegistry = await hre.ethers.getContractFactory("FactCheckRegistry");
  const registry = await FactCheckRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ FactCheckRegistry deployed to:", registryAddress);

  // Deploy StakePool
  console.log("\n💰 Deploying StakePool...");
  const StakePool = await hre.ethers.getContractFactory("StakePool");
  const stakePool = await StakePool.deploy(registryAddress);
  await stakePool.waitForDeployment();
  const stakePoolAddress = await stakePool.getAddress();
  console.log("✅ StakePool deployed to:", stakePoolAddress);

  // Save addresses
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`FactCheckRegistry: ${registryAddress}`);
  console.log(`StakePool:         ${stakePoolAddress}`);
  console.log("=".repeat(60));
  console.log("\n💡 Save these addresses for your frontend!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });