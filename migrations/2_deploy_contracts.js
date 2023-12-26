// 2_deploy_contracts.js
const Database = artifacts.require("Database");

module.exports = function (deployer) {
  deployer.deploy(Database, { gas: 10000000, gasPrice: 40000000000 }); // Adjust gas price accordingly
};
