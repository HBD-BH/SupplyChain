import Web3 from "web3";
import supplyChainArtifact from "../../build/contracts/SupplyChain.json";

const App = {
  web3: null,
  account: null,
  farmer: null,
  company: null,
  distributor: null,
  retailer: null,
  customer: null,
  meta: null,

  start: async function() {
    const { web3 } = this;

    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = supplyChainArtifact.networks[networkId];
      this.meta = new web3.eth.Contract(
        supplyChainArtifact.abi,
        deployedNetwork.address,
        {from: "0x264Ec1Dc6FaBa352A779B4D7e8fee2368e717533"}
      );

      // get accounts
      const accounts = await web3.eth.requestAccounts();
      //web3.eth.requestAccounts().then(console.log).catch(console.log);
      this.account = accounts[0];
      this.farmer = accounts[0];
      this.company = accounts[0];
      this.distributor = accounts[0];
      this.retailer = accounts[0];
      this.customer = accounts[0];
      App.setStatus("Loaded");

    } catch (error) {
      console.error(`Could not connect to contract or chain. Error: ${error.message}`);
    }
  },

  setStatus: function(message) {
    const status = document.getElementById("status");
    status.innerHTML = message;
  },

  addRole: async function() {
    const { addRole } = this.meta.methods;
    const role = document.getElementById("role").value;
    await addRole(role, this.farmer).call();
    App.setStatus("Added role " + role + " to address " + this.farmer + ".");
  },

  plantSoy: async function() {
    const { plantSoy } = this.meta.methods;
    const soyName = document.getElementById("soyName").value;
    console.log(`Name: ${soyName}`);
    const soyUpc = document.getElementById("soyUpc").value;
    console.log(`UPC: ${soyUpc}`);
    const soyLat = document.getElementById("soyLat").value;
    console.log(`Lat: ${soyLat}`);
    const soyLong = document.getElementById("soyLong").value;
    console.log(`Long: ${soyLong}`);
    const soyPrice = document.getElementById("soyPrice").value;
    console.log(`Price: ${soyPrice}`);
    App.setStatus("Collecting done")
    await plantSoy(soyName, soyUpc, soyPrice, soyLat, soyLong).send();
    App.setStatus("Soy with UPC " + soyUpc + "planted.");
  },

  getSoy: async function() {
    const { getSoy } = this.meta.methods;
    const checkUpc = document.getElementById("checkUpc").value;
    const soyInfo = await getSoy(checkUpc).call();
    document.getElementById("lblCheckUpcSoy").innerHTML = checkUpc;
    document.getElementById("lblNameSoy").innerHTML = soyInfo[0];
    App.setStatus("Soy validated.");
  },
};

window.App = App;

window.addEventListener("load", async function() {
  if (window.ethereum) {
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    await window.ethereum.enable(); // get permission to access accounts
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live",);
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    App.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"),);
  }

  App.start();
});
