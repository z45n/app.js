// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserProfile {
    event ProfileUpdated(address indexed user, string fname, string lname, string email, string ID, string document);
    event ProfileRetrieved(address indexed user, string fname, string lname, string email, string ID, string document);

    // New struct to store user profile data
    struct UserProfileData {
        string fname;
        string lname;
        string email;
        string ID;
        string document;
    }

    // Mapping to associate Ethereum addresses with user profile data
    mapping(address => UserProfileData) private userProfileData;

    // Function to update user profile data
    function updateProfile(string memory fname, string memory lname, string memory email, string memory ID, string memory document) public {
        userProfileData[msg.sender] = UserProfileData({
            fname: fname,
            lname: lname,
            email: email,
            ID: ID,
            document: document
        });

        emit ProfileUpdated(msg.sender, fname, lname, email, ID, document);
    }

    // Function to retrieve user profile data
    function getUserProfile() public view returns (string memory fname, string memory lname, string memory email, string memory ID, string memory document) {
        UserProfileData memory data = userProfileData[msg.sender];
        return (data.fname, data.lname, data.email, data.ID, data.document);
    }
}
