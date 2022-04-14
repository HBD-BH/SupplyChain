const Migrations = artifacts.require("TofuSupplyChain");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
