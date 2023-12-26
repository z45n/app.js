module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777",
      gas: 10000000,
      gasPrice: 40000000000, // Match this with the gas price in Ganache
    },
  },
  
  contracts_build_directory: './build/contracts',  // Explicitly set the build directory

  compilers: {
    solc: {
      version: "0.8.2",
    },
  },
};
