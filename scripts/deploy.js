const hre = require("hardhat");

async function main() {
  const ticketPrice = hre.ethers.parseEther("0.01");
  const chronosServiceAddress = "0x0000000000000000000000000000000000000830"; 

  const lottery = await hre.ethers.deployContract("AutomatedDailyLottery", [ticketPrice, chronosServiceAddress]);

  await lottery.waitForDeployment();

  console.log(
    `AutomatedDailyLottery deployed to: ${lottery.target}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});