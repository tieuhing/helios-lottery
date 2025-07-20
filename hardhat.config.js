require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.30",
  networks: {
    helios_testnet: {
      url: "https://testnet1.helioschainlabs.org",
      chainId: 42000,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};