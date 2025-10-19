import { ethers } from "ethers";
import hre from "hardhat";

async function main() {
  // Get contract address from environment variable
  const FACT_CHECK_REGISTRY_ADDRESS = process.env.FACT_CHECK_REGISTRY_ADDRESS;
  
  if (!FACT_CHECK_REGISTRY_ADDRESS) {
    console.error("❌ FACT_CHECK_REGISTRY_ADDRESS environment variable is not set");
    console.log("💡 Add FACT_CHECK_REGISTRY_ADDRESS=your_contract_address to your .env file");
    process.exit(1);
  }
  
  console.log("📋 Using contract address:", FACT_CHECK_REGISTRY_ADDRESS);

  console.log("🔍 Checking contract owner...");
  
  try {
    const registry = await hre.ethers.getContractAt("FactCheckRegistry", FACT_CHECK_REGISTRY_ADDRESS);
    const owner = await registry.owner();
    console.log("✅ Contract Owner:", owner);
    
    // Check if you're the owner
    const [deployer] = await hre.ethers.getSigners();
    const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
    console.log("👤 Your Address:", deployer.address);
    console.log("🎯 Are you the owner?", isOwner ? "✅ YES" : "❌ NO");
    
  } catch (error) {
    console.error("❌ Error checking owner:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
