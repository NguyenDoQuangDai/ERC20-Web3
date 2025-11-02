const { ethers } = require("hardhat");

async function main() {

  // GÁN THẲNG ĐỊA CHỈ TOKEN
  const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Lấy 3 account đầu của Hardhat
  const [owner, spender, receiver] = await ethers.getSigners();

  const token = await ethers.getContractAt(
    "NguyenDoQuangDai", 
    tokenAddress
  );

  const amount = ethers.parseUnits("10", 18);

  console.log("Executing transferFrom...");
  console.log(`From: ${owner.address}`);
  console.log(`To: ${receiver.address}`);
  console.log(`Spender: ${spender.address}`);
  console.log(`Amount: ${ethers.formatUnits(amount, 18)} tokens`);

  // Chuyển bằng spender (phải được approve trước!)
  const tokenWithSpender = token.connect(spender);

  const tx = await tokenWithSpender.transferFrom(
    owner.address,
    receiver.address,
    amount
  );

  console.log("Tx sent:", tx.hash);
  await tx.wait();
  console.log("✅ transferFrom thành công!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exitCode = 1;
});
