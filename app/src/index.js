import Web3 from "web3";
import supplyChainArtifact from "../../build/contracts/SupplyChain.json";

let currentAccount = null;

const App = {
    web3: null,
    owner: null,
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
                {from: currentAccount}
            );

            // get accounts
            const accounts = await web3.eth.requestAccounts();
            currentAccount = accounts[0];
            this.owner = this.web3.utils.toChecksumAddress(accounts[0]); // Necessary for role assignments

        } catch (error) {
            console.error(`Could not connect to contract or chain. Error: ${error.message}`);
        }
    },

    // Adapted from MAHENDRAN KANAGARAJ here: https://ethereum.stackexchange.com/a/102388
    onInit: async function() {
        await window.ethereum.enable();
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        console.log(`Current account: ${currentAccount}`)
        window.ethereum.on('accountsChanged', function (accounts) {
            currentAccount = accounts[0];
            console.log(`Switched account to: ${currentAccount}`)
        });
    },

    setStatus: function(message) {
        const status = document.getElementById("status");
        status.innerHTML = message;
    },

    addRole: async function() {
        const { addRole } = this.meta.methods;
        const { isRole } = this.meta.methods;
        console.log(`Account: ${currentAccount}`)
        const role = document.getElementById("role").value;
        const roleAddress = this.web3.utils.toChecksumAddress(document.getElementById("address").value);
        await addRole(role, roleAddress).send({from: this.owner});
        const bSuccess = await isRole(role, roleAddress).call();
        App.setStatus("Added role " + role + " to address " + roleAddress + ", success: " + bSuccess + ".");
    },

    removeRole: async function() {
        const { removeRole } = this.meta.methods;
        console.log(`Account: ${currentAccount}`)
        const role = document.getElementById("role").value;
        const address = document.getElementById("address").value;
        await removeRole(role, address).send({from: this.owner});
        //const bSuccess = await isRole(role, address).call();
        App.setStatus("Removed role " + role + " from address " + address + ".");
    },

    plantSoy: async function() {
        const { plantSoy } = this.meta.methods;
        const soyName = document.getElementById("soyName").value;
        const soyUpc = document.getElementById("soyUpc").value;
        const soyLat = document.getElementById("soyLat").value;
        const soyLong = document.getElementById("soyLong").value;
        const soyPrice = document.getElementById("soyPrice").value;
        await plantSoy(soyName, soyUpc, soyPrice, soyLat, soyLong).send();
        App.setStatus("Soy with UPC " + soyUpc + "planted.");
    },

    checkSoy: async function() {
        const { checkSoy } = this.meta.methods;
        const soyUpc = document.getElementById("soyUpc").value;
        await checkSoy(soyUpc).send();
        App.setStatus("Checked soy with UPC " + soyUpc + ".");
    },

    harvestSoy: async function() {
        const { harvestSoy } = this.meta.methods;
        const soyUpc = document.getElementById("soyUpc").value;
        await harvestSoy(soyUpc).send();
        App.setStatus("Harvested soy with UPC " + soyUpc + ".");
    },

    orderSoy: async function() {
        const { orderSoy } = this.meta.methods;
        const soyUpc = document.getElementById("soyUpc").value;
        const balance = document.getElementById("soyOrderEther").value;
        await orderSoy(soyUpc).send({value: balance});
        App.setStatus("Address ordered soy with UPC " + soyUpc + ".");
    },

    shipSoy: async function() {
        const { shipSoy } = this.meta.methods;
        const soyUpc = document.getElementById("soyUpc").value;
        await shipSoy(soyUpc).send();
        App.setStatus("Soy with UPC " + soyUpc + " shipped.");
    },

    fetchSoy: async function() {
        const { fetchSoy } = this.meta.methods;
        const soyUpc = document.getElementById("soyUpc").value;
        await fetchSoy(soyUpc).send();
        App.setStatus("Soy with UPC " + soyUpc + " fetched.");
    },

    deliverSoy: async function() {
        const { deliverSoy } = this.meta.methods;
        const soyUpc = document.getElementById("soyUpc").value;
        await deliverSoy(soyUpc).send();
        App.setStatus("Soy with UPC " + soyUpc + " delivered.");
    },

    makeTofu: async function() {
        const { makeTofu } = this.meta.methods;
        const tofuName = document.getElementById("tofuName").value;
        const tofuUpc = document.getElementById("tofuUpc").value;
        const tofuLat = document.getElementById("tofuLat").value;
        const tofuLong = document.getElementById("tofuLong").value;
        const tofuPrice = document.getElementById("tofuPrice").value;
        const soyUpc = document.getElementById("tofuSoyUpc").value;
        await makeTofu(tofuName, soyUpc, tofuUpc, tofuPrice, tofuLat, tofuLong).send();
        App.setStatus("Made tofu with UPC " + tofuUpc + " from soy with UPC " + soyUpc + ".");
    },

    orderTofu: async function() {
        const { orderTofu } = this.meta.methods;
        const tofuUpc = document.getElementById("tofuUpc").value;
        const balance = document.getElementById("tofuOrderEther").value;
        await orderTofu(tofuUpc).send({value: balance});
        App.setStatus("Address ordered tofu with UPC " + tofuUpc + ".");
    },

    shipTofu: async function() {
        const { shipTofu } = this.meta.methods;
        const tofuUpc = document.getElementById("tofuUpc").value;
        await shipTofu(tofuUpc).send();
        App.setStatus("Tofu with UPC " + tofuUpc + " shipped.");
    },

    fetchTofu: async function() {
        const { fetchTofu } = this.meta.methods;
        const tofuUpc = document.getElementById("tofuUpc").value;
        await fetchTofu(tofuUpc).send();
        App.setStatus("Tofu with UPC " + tofuUpc + " fetched.");
    },

    deliverTofu: async function() {
        const { deliverTofu } = this.meta.methods;
        const tofuUpc = document.getElementById("tofuUpc").value;
        await deliverTofu(tofuUpc).send();
        App.setStatus("Tofu with UPC " + tofuUpc + " delivered.");
    },

    putTofuOnSale: async function() {
        const { putTofuOnSale } = this.meta.methods;
        const tofuUpc = document.getElementById("tofuUpc").value;
        const tofuRetailPrice = document.getElementById("tofuRetailPrice").value;
        await putTofuOnSale(tofuUpc, tofuRetailPrice).send();
        App.setStatus("Tofu with UPC " + tofuUpc + " put on sale.");
    },

    buyTofu: async function() {
        const { buyTofu } = this.meta.methods;
        const tofuUpc = document.getElementById("tofuUpc").value;
        const balance = document.getElementById("tofuPurchaseEther").value;
        await buyTofu(tofuUpc).send({value: balance});
        App.setStatus("Address " + " purchased tofu with UPC " + tofuUpc + ".");
    },


    getSoy: async function() {
        const { getSoy } = this.meta.methods;
        // console.log(`Account: ${currentAccount}`) // For debugging purposes
        const checkUpc = document.getElementById("checkUpcSoy").value;
        const soyInfo = await getSoy(checkUpc).call();
        document.getElementById("lblCheckUpcSoy").innerHTML = checkUpc;
        document.getElementById("lblNameSoy").innerHTML = soyInfo[0];
        document.getElementById("lblPriceSoy").innerHTML = soyInfo[2];
        document.getElementById("lblStateSoy").innerHTML = soyInfo[3];
        document.getElementById("lblFarmer").innerHTML = soyInfo[4];
        document.getElementById("lblLatSoy").innerHTML = soyInfo[5];
        document.getElementById("lblLongSoy").innerHTML = soyInfo[6];
        document.getElementById("lblDistributorSoy").innerHTML = soyInfo[7];
        document.getElementById("lblBuyer").innerHTML = soyInfo[8];
        document.getElementById("lblToTofuUpc").innerHTML = soyInfo[9];
        App.setStatus("Soy validated.");
    },

    getTofu: async function() {
        const { getTofu } = this.meta.methods;
        const checkUpc = document.getElementById("checkUpcTofu").value;
        const tofuInfo = await getTofu(checkUpc).call();
        document.getElementById("lblCheckUpcTofu").innerHTML = checkUpc;
        document.getElementById("lblNameTofu").innerHTML = tofuInfo[0];
        document.getElementById("lblPriceTofu").innerHTML = tofuInfo[2];
        document.getElementById("lblStateTofu").innerHTML = tofuInfo[3];
        document.getElementById("lblProducer").innerHTML = tofuInfo[4];
        document.getElementById("lblLatTofu").innerHTML = tofuInfo[5];
        document.getElementById("lblLongTofu").innerHTML = tofuInfo[6];
        document.getElementById("lblDistributorTofu").innerHTML = tofuInfo[7];
        document.getElementById("lblRetailer").innerHTML = tofuInfo[8];
        document.getElementById("lblCustomer").innerHTML = tofuInfo[9];
        document.getElementById("lblFromSoyUpc").innerHTML = tofuInfo[10];
        App.setStatus("Tofu validated.");
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

    App.onInit();
    App.start();

});
