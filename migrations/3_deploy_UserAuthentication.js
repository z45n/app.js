// 2_deploy_contracts.js
const Database = artifacts.require("UserAuthentication");

module.exports = function (deployer) {
  deployer.deploy(Database, { gas: 10000000, gasPrice: 40000000000 }); // Adjust gas price accordingly
};                                  
