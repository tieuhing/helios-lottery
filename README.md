# Helios Automated Daily Lottery

This repository contains the code for a simple, automated daily lottery DApp built on the Helios blockchain. It serves as a tutorial for using **Chronos**, the native smart contract scheduling service on Helios.

## Quick Start

This section is for users who want to quickly deploy and run the project.

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or later)
* [MetaMask](https://metamask.io/) browser extension

### Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd helios-lottery
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure your environment:**
   * Create a `.env` file by copying the example: `cp .env.example .env`
   * Open the `.env` file and replace `YOUR_METAMASK_PRIVATE_KEY` with your actual private key (without the `0x` prefix).
   * Get some testnet HLS from the [Helios Testnet Faucet](https://testnet.helioschain.network) and send it to the wallet associated with your private key. You will need it for deployment and scheduling.

### Deployment, Verification, and Scheduling

Follow these steps in order to get your automated lottery up and running.

1. **Compile the contract:**

   ```bash
   npx hardhat compile
   ```

2. **Deploy the lottery contract:**

   ```bash
   npx hardhat run scripts/deploy.js --network helios_testnet
   ```

   The script will output the address of your deployed `AutomatedDailyLottery` contract. **Copy this address.**

3. **Verify the contract:**

   Run the helper script to generate the necessary verification files. The script will prompt you to enter the contract address you just copied.

   ```bash
   npx hardhat run scripts/extract-input.js
   ```

   This will create an `output` directory. Open the `output/verify-smart-contracts.md` file and follow the instructions inside to complete verification on the Helios Explorer.

   After verification, your smart contracts in helios explorer would be looks like this.

   ![Smart Contracts Verified](./smart-contracts-verified.png)

4. **Schedule the automated task:**

   Once your contract is verified, you can schedule the daily `drawWinner` function.
   * Open `scripts/schedule.js` and replace the placeholder `YOUR_DEPLOYED_CONTRACT_ADDRESS` with your actual contract address.
   * Run the scheduling script:

     ```bash
     npx hardhat run scripts/schedule.js --network helios_testnet
     ```

### Checking the Scheduled Task

Your automated lottery is now running! To verify that the Chronos task was scheduled correctly:

1. Go to the [Helios Explorer](https://explorer.helioschainlabs.org) and search for your deployed lottery contract address.
2. Go to the **"Read Contract"** tab.
3. Find the `getCronTaskInfo` function and click "Query".
4. You will see the `cronId`, the `cronWallet` address, and the `cronWalletBalance` (which should be 1 HLS). This confirms the task is scheduled and funded.

Successfully deploying and scheduling a task with Chronos earns you XP on the Helios Testnet!

![Chronos Deploy Achievement](./chronos-deploy-achievements.png)

---

## Tutorial: Building From Scratch

This tutorial will guide you through building, deploying, verifying, and scheduling the decentralized application from the very beginning.

### Introduction

Our goal is to build a lottery smart contract where users can purchase tickets. The winner selection process will be automatically triggered every 24 hours by the Chronos service, making the lottery truly autonomous and decentralized.

### Step 1: Setting Up the Project

First, we'll set up our development environment using Hardhat, a popular framework for Ethereum development.

1. **Create a project directory:**

   ```bash
   mkdir helios-lottery
   cd helios-lottery
   ```

2. **Initialize a Node.js project:**

   ```bash
   npm init -y
   ```

3. **Install Hardhat and dependencies:**

   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv chalk
   ```

4. **Initialize a Hardhat project:**

   ```bash
   npx hardhat
   ```

   Select "Create a JavaScript project" and accept the defaults.

5. **Create a `.gitignore` file:**

   Create a file named `.gitignore` in the root of your project and add the following lines to it:

   ```
   node_modules
   .env
   cache
   artifacts
   output
   ```

### Step 2: Configuring Hardhat for Helios

Now, we'll configure Hardhat to connect to the Helios Testnet.

1. **Create a `.env` file:**

   Create a file named `.env` in the root of your project. This file will store your private key. **Do not share this file with anyone.**

   ```
   PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY
   ```

   Replace `YOUR_METAMASK_PRIVATE_KEY` with the private key of the account you want to use for deployment.

2. **Update `hardhat.config.js`:**

   Replace the content of your `hardhat.config.js` file with the following:

   ```javascript
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
   ```

### Step 3: The Smart Contract

Now, let's write the `AutomatedDailyLottery` smart contract.

Delete the sample `Lock.sol` file in the `contracts` directory and create a new file named `AutomatedDailyLottery.sol` with the following content:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract AutomatedDailyLottery {
    address[] public players;
    uint256 public ticketPrice;
    address public chronosServiceAddress;
    address public owner;

    // Chronos Task Info
    uint256 public cronId;
    address public cronWallet;

    event LotteryEnter(address indexed player);
    event WinnerPaid(address indexed winner, uint256 amount);
    event CronTaskSet(uint256 indexed cronId, address indexed cronWallet);

    struct CronTaskInfo {
        uint256 cronId;
        address cronWallet;
        uint256 cronWalletBalance;
    }

    modifier onlyChronos() {
        require(msg.sender == chronosServiceAddress, "Only Chronos service can call this function");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not the owner.");
        _;
    }

    constructor(uint256 _ticketPrice, address _chronosServiceAddress) {
        owner = msg.sender;
        ticketPrice = _ticketPrice;
        chronosServiceAddress = _chronosServiceAddress;
    }

    function enter() public payable {
        require(msg.value >= ticketPrice, "Not enough HLS to enter");
        players.push(msg.sender);
        emit LotteryEnter(msg.sender);
    }

    function drawWinner() public onlyChronos {
        require(players.length > 0, "No players in the lottery");
        uint256 totalAmount = address(this).balance;
        
        uint256 winnerIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, players))) % players.length;
        address payable winner = payable(players[winnerIndex]);

        (bool success, ) = winner.call{value: totalAmount}("");
        require(success, "Failed to send money");

        emit WinnerPaid(winner, totalAmount);

        players = new address[](0);
    }

    function setCronTaskDetails(uint256 _cronId, address _cronWallet) public onlyOwner {
        cronId = _cronId;
        cronWallet = _cronWallet;
        emit CronTaskSet(_cronId, _cronWallet);
    }

    function getCronTaskInfo() public view returns (CronTaskInfo memory) {
        return CronTaskInfo({
            cronId: cronId,
            cronWallet: cronWallet,
            cronWalletBalance: cronWallet.balance
        });
    }

    function getPlayers() public view returns (address[] memory) {
        return players;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

### Step 4: The Helper Scripts

This project uses three main scripts located in the `scripts/` directory to manage the DApp's lifecycle. If you've cloned this repository, these files are already created for you.

1. **`scripts/deploy.js`**: This script handles the deployment of the `AutomatedDailyLottery` smart contract to the blockchain. It logs the new contract address upon successful deployment.

2. **`scripts/extract-input.js`**: After deployment, this script generates the necessary files for contract verification on the Helios Explorer. It takes the deployed contract address as an argument and creates a `verify-input.json` file and a `verify-smart-contracts.md` tutorial in the `output/` directory.

3. **`scripts/schedule.js`**: This script interacts with the Chronos precompile to schedule the daily execution of the `drawWinner` function. You will need to edit this file to insert your deployed contract's address before running it.

### Step 5: Compile and Deploy

1. **Compile the contract:**

   ```bash
   npx hardhat compile
   ```

2. **Deploy the contract:**

   ```bash
   npx hardhat run scripts/deploy.js --network helios_testnet
   ```

   After running the deploy command, **copy the deployed contract address**. You will need it for the next two steps.

### Step 6: Verify the Contract on the Explorer

Verifying your contract is a crucial step that builds trust and enables UI interaction.

1. **Generate Verification Files:**

   Run the `extract-input.js` script, passing your newly deployed contract address as an argument:

   ```bash
   npx hardhat run scripts/extract-input.js <YOUR_DEPLOYED_CONTRACT_ADDRESS>
   ```

2. **Follow the Verification Tutorial:**

   The script will create an `output` directory. Open the `output/verify-smart-contracts.md` file and follow the detailed, step-by-step instructions to complete the verification process on the Helios Explorer.

### Step 7: Scheduling the Automated Task

Now that your contract is deployed and verified, you can schedule the `drawWinner` function to run automatically.

1. **Update and Run the Scheduling Script:**
   * Open `scripts/schedule.js` and replace the placeholder `YOUR_DEPLOYED_CONTRACT_ADDRESS` with your actual contract address.
   * Execute the script:

     ```bash
     npx hardhat run scripts/schedule.js --network helios_testnet
     ```

### Step 8: Verifying the Chronos Task

Thanks to the `getCronTaskInfo` function in our contract, verifying the scheduled task is simple.

1. Go to the [Helios Explorer](https://explorer.helioschainlabs.org) and search for your deployed lottery contract address.
2. Go to the **"Read Contract"** tab.
3. Find the `getCronTaskInfo` function and click "Query".
4. The explorer will show you the results:
   * `cronId`: The unique ID of your task. A non-zero value proves it's scheduled.
   * `cronWallet`: The address of the dedicated wallet created to pay for the task's execution.
   * `cronWalletBalance`: The amount of HLS held by the cron wallet to pay for future gas fees. This should be `1000000000000000000` (which is 1 HLS in wei).

This provides definitive, on-chain proof that your task is scheduled and funded. After 24 hours, you can also check the "Events" tab on the explorer for a `WinnerPaid` event to confirm the execution was successful.

### Conclusion

Congratulations! You have successfully built, deployed, verified, and scheduled an automated daily lottery on the Helios blockchain. You have learned how to use Hardhat, interact with precompiles like Chronos, and create a user-friendly DApp that provides on-chain verification of its automated components.