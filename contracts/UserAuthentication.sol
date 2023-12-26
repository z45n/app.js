// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserAuthentication {
    struct User {
        string passwordHash;
        string hashCode;
        bool exists;
        bool hashCodeGenerated;
    }

    mapping(string => User) private users;
    mapping(string => string) public userHashCodes; // Added this line

    event UserRegistered(string username, string passwordHash);
    event HashCodeGenerated(string username, string hashCode);
    event RegistrationFailed(string username, string reason);
    event TransactionProcessed(address indexed user, uint256 amount, uint256 fee);

    address payable public owner; // Address of the contract owner

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can call this function");
        _;
    }

    constructor() {
        owner = payable(msg.sender);
    }

    // Function to process a transaction and deduct a fee
    function processTransaction() external payable onlyOwner {
        require(msg.value > 0, "Transaction value must be greater than 0");

        // Deduct a fee, e.g., 0.01 ETH
        uint256 fee = 0.01 ether;
        require(msg.value >= fee, "Insufficient funds");

        // Perform your transaction processing logic here

        // Emit an event to log the transaction details
        emit TransactionProcessed(msg.sender, msg.value, fee);

        // Transfer the fee to the contract owner
        owner.transfer(fee);
    }

    function registerUser(string memory username, string memory passwordHash) external {
        require(!users[username].exists, "User registration failed: Username is already taken");

        users[username] = User({
            passwordHash: passwordHash,
            hashCode: "",
            exists: true,
            hashCodeGenerated: false
        });

        emit UserRegistered(username, passwordHash);
    }

    function generateRandomHashCode() internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender));
        return toString(hash);
    }

    function generateHashCode(string memory username) external returns (string memory) {
        require(users[username].exists, "Generate hash code failed: User does not exist");

        if (!users[username].hashCodeGenerated) {
            users[username].hashCode = generateRandomHashCode();
            users[username].hashCodeGenerated = true;
            userHashCodes[username] = users[username].hashCode;

            emit HashCodeGenerated(username, users[username].hashCode);
        }

        return users[username].hashCode;
    }

    function toString(bytes32 x) internal pure returns (string memory) {
        bytes memory bytesString = new bytes(10);
        for (uint i = 0; i < 10; i++) {
            bytesString[i] = x[i];
        }
        return string(bytesString);
    }

    function getGeneratedHashCode(string memory username) external view returns (string memory) {
        return userHashCodes[username];
    }

    function isUsernameTaken(string memory username) external view returns (bool) {
        return users[username].exists;
    }

    function authenticateUser(string memory username, string memory passwordHash, string memory providedHashCode) external view returns (bool) {
        bool isUserValid = users[username].exists &&
                           (keccak256(abi.encodePacked(users[username].passwordHash)) == keccak256(abi.encodePacked(passwordHash))) &&
                           (keccak256(abi.encodePacked(users[username].hashCode)) == keccak256(abi.encodePacked(providedHashCode)));

        if (!isUserValid) {
            // Handle authentication failure
        }

        return isUserValid;
    }
}
