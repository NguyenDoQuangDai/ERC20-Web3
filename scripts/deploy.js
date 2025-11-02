async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const MyToken = await ethers.getContractFactory("NguyenDoQuangDai");
  const token = await MyToken.deploy(1000000); // 1 triệu token
  await token.waitForDeployment();

  console.log("Token deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
