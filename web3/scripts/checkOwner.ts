import { ethers } from "ethers";
import hre from "hardhat";

async function main() {
  // Replace with your actual contract address
  const FACT_CHECK_REGISTRY_ADDRESS = "0x8105114191607a4F160561BaF7556E79bEe8E8e2";
  
  // Contract address is set, proceed with checking owner

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
