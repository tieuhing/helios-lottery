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