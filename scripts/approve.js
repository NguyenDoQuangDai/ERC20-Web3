const { ethers } = require("hardhat");

async function main() {
  const [owner, spender] = await ethers.getSigners();
  const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const token = await ethers.getContractAt("NguyenDoQuangDai", tokenAddress);

  const amount = ethers.parseUnits("100", 18);

  const tx = await token.approve(spender.address, amount);
  await tx.wait();
  console.log("✅ Approved from Hardhat owner!");
  console.log("owner:", owner.address);
  console.log("spender:", spender.address);
}

main();
