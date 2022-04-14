const Migrations = artifacts.require("SupplyChain");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
