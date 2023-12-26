// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Database {
    event Debug(string message, string key, string value);

    // New struct to store user data
    struct UserData {
        string fname;
        string lname;
        string email;
        string ID;
        string document;
    }

    // Mapping to associate Ethereum addresses with user data
    mapping(address => UserData) private usersData;

    mapping(string => bool) private usernameTaken;
    mapping(string => string) private hashedPasswords;

    constructor() {
        emit Debug("Contract deployed", "", "");
    }

    function isUsernameTaken(string memory username) public view returns (bool) {
    return usernameTaken[username];
}


    // Register user with username and hashedPassword
    function registerUser(string memory username, string memory hashedPassword) public {
        require(!usernameTaken[username], "Username is already taken");
        usernameTaken[username] = true;
        hashedPasswords[username] = hashedPassword;

        emit Debug("User registered", username, hashedPassword);
    }

    // Update user profile with additional information
    function updateUserProfile(string memory fname, string memory lname, string memory email, string memory ID, string memory document) public {
    // Update user profile data
    UserData storage userData = usersData[msg.sender];
    userData.fname = fname;
    userData.lname = lname;
    userData.email = email;
    userData.ID = ID;
    userData.document = document;

    emit Debug("User profile updated", "", "");
}


    function getHashedPassword(string memory username) public view returns (string memory) {
        require(usernameTaken[username], "User does not exist");
        return hashedPasswords[username];
    }

    // Retrieve user profile data
    function getUserData() public view returns (string memory fname, string memory lname, string memory email, string memory ID, string memory document) {
        UserData memory userData = usersData[msg.sender];
        return (userData.fname, userData.lname, userData.email, userData.ID, userData.document);
    }
}
