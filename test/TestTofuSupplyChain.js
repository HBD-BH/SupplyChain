const TofuSupplyChain = artifacts.require("TofuSupplyChain");
const BigNumber = require('bignumber.js');
const Web3Utils = require('web3-utils');


let accounts;
let owner;
let farmer;
let tofuCompany;
let distributor;
let retailer;
let customer;

let soySku = 0;
let tofuSku = 100

// From TofuSupplyChain.sol
// enum soyState {Planted, Ripe, Harvested, Ordered, ReadyForShipping, Shipping, Delivered, Used}
const soyStateEnum = Object.freeze({
    Planted: 0,
    Ripe: 1,
    Harvested: 2,
    Ordered: 3,
    ReadyForShipping: 4,
    Shipping: 5,
    Delivered: 6,
    Used: 7
});

// From TofuSupplyChain.sol
// enum tofuState {Produced, Ordered, ReadyForShipping, Shipping, Delivered, OnSale, Sold}
const tofuStateEnum = Object.freeze({
    Produced: 0,
    Ordered: 1,
    ReadyForShipping: 2,
    Shipping: 3,
    Delivered: 4,
    OnSale: 5,
    Sold: 6
});

// For these tests, the following roles apply:
// accounts[0]: owner and farmer
// accounts[1]: tofu company
// accounts[2]: distributor
// accounts[3]: retailer
// accounts[4]: final customer

contract('TofuSupplyChain', (accs) => {
    accounts = accs;
    owner = accounts[0];

    farmer = accounts[0];
    tofuCompany = accounts[1];
    distributor = accounts[2];
    retailer = accounts[3];
    customer = accounts[4];
})

it('can plant soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "First bean";
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.name, soyName, "Soy not planted properly");
    assert.equal(mySoy.price, soyPrice, "Soy price not assigned correctly");
    assert.equal(mySoy.seller, farmer, "Soy farmer not attributed correctly");
})


it ('can check soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Bean two";
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.state, soyStateEnum.Ripe, "Soy has not riped correctly");
})

it ('can harvest soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "New bean";
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.state, soyStateEnum.Harvested, "Could not harvest soy");

})

it ('can order soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Best bean";
    let balance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: balance});
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.state, soyStateEnum.Ordered, "Could not order soy");
    assert.equal(mySoy.buyer, tofuCompany, "Soy buyer not assigned properly");
})

it('adjusts balances correctly when ordering soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Excelent bean";
    let balance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    let balanceBuyer_before = await web3.eth.getBalance(tofuCompany);
    let balanceSeller_before = await web3.eth.getBalance(farmer);
    let receipt = await instance.orderSoy(soySku, {from: tofuCompany, value: balance});
    let balanceBuyer_after = await web3.eth.getBalance(tofuCompany);
    let balanceSeller_after = await web3.eth.getBalance(farmer);

    // Calculating amount paid for gas: adapted from Ismael: https://ethereum.stackexchange.com/a/42175
    const gasUsed = BigNumber(receipt.receipt.gasUsed);
    const tx = await web3.eth.getTransaction(receipt.tx);
    let gasPrice = BigNumber(tx.gasPrice);
    let gasFee = gasPrice * gasUsed;


    let value = BigNumber(balanceBuyer_after).plus(gasFee).plus(BigNumber(soyPrice));

    assert.equal(balanceSeller_after, Number(BigNumber(balanceSeller_before).plus(BigNumber(soyPrice))), "Balance of seller did not increase correctly");
    assert.equal(balanceBuyer_before, value, "Balance of buyer did not decrease correctly");
})

it('can ship soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Awesome bean";
    let balance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: balance});
    await instance.shipSoy(soySku, {from: farmer});
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.state, soyStateEnum.ReadyForShipping, "Could not ship soy");
})

it('can fetch soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Awesome bean2";
    let balance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: balance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.state, soyStateEnum.Shipping, "Could not fetch soy");
    assert.equal(mySoy.distributor, distributor, "Distributor not assignd properly");
})

it('can deliver soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Next great bean";
    let balance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: balance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    await instance.deliverSoy(soySku, {from: distributor});
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.state, soyStateEnum.Delivered, "Could not deliver soy");
})

it('can make tofu', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let balance = Web3Utils.toWei(".05", "ether");
    let soyName = "Our best bean";
    tofuSku = tofuSku + 1;
    let tofuName = "Our best tofu";
    let tofuPrice = Web3Utils.toWei(".02", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: balance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    await instance.deliverSoy(soySku, {from: distributor});
    await instance.makeTofu(tofuName, soySku, tofuPrice, {from: tofuCompany});

    let mySoy = await instance.getSoy.call(soySku);
    let myTofu = await instance.getTofu.call(tofuSku);
    assert.equal(mySoy.state, soyStateEnum.Used, "Could not use soy");
    assert.equal(mySoy.toTofuSku, tofuSku, "Could not link soy to yielded tofu sku");
    assert.equal(myTofu.state, tofuStateEnum.Produced, "Could not produce tofu");
    assert.equal(myTofu.price, tofuPrice, "Could not add price information for tofu");
    assert.equal(myTofu.name, tofuName, "Could not add tofu name");
    assert.equal(myTofu.producer, tofuCompany, "Could not add tofu producer");
    assert.equal(myTofu.fromSoySku, soySku, "Could not link tofu to original soy sku");
})

it('can order tofu', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Our best bean";
    tofuSku = tofuSku + 1;
    let tofuName = "Our new tofu";
    let tofuPrice = Web3Utils.toWei(".02", "ether");
    let soyBalance = Web3Utils.toWei(".05", "ether");
    let tofuBalance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: soyBalance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    await instance.deliverSoy(soySku, {from: distributor});
    await instance.makeTofu(tofuName, soySku, tofuPrice, {from: tofuCompany});
    await instance.orderTofu(tofuSku, {from: retailer, value: tofuBalance});

    let myTofu = await instance.getTofu.call(tofuSku);
    assert.equal(myTofu.state, tofuStateEnum.Ordered, "Could not order tofu");
    assert.equal(myTofu.retailer, retailer, "Could not assign retailer properly");
})

it('adjusts balances correctly when ordering tofu', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Our best bean";
    tofuSku = tofuSku + 1;
    let tofuName = "Our new tofu";
    let tofuPrice = Web3Utils.toWei(".02", "ether");
    let soyBalance = Web3Utils.toWei(".05", "ether");
    let tofuBalance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: soyBalance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    await instance.deliverSoy(soySku, {from: distributor});
    await instance.makeTofu(tofuName, soySku, tofuPrice, {from: tofuCompany});
    let balanceRetailer_before = await web3.eth.getBalance(retailer);
    let balanceProducer_before = await web3.eth.getBalance(tofuCompany);
    let receipt = await instance.orderTofu(tofuSku, {from: retailer, value: tofuBalance});
    let balanceRetailer_after = await web3.eth.getBalance(retailer);
    let balanceProducer_after = await web3.eth.getBalance(tofuCompany);

    // Calculating amount paid for gas: adapted from Ismael: https://ethereum.stackexchange.com/a/42175
    const gasUsed = BigNumber(receipt.receipt.gasUsed);
    const tx = await web3.eth.getTransaction(receipt.tx);
    let gasPrice = BigNumber(tx.gasPrice);
    let gasFee = gasPrice * gasUsed;


    let value = BigNumber(balanceRetailer_after).plus(gasFee).plus(BigNumber(tofuPrice));

    assert.equal(balanceProducer_after, Number(BigNumber(balanceProducer_before).plus(BigNumber(tofuPrice))), "Balance of producer did not increase correctly");
    assert.equal(balanceRetailer_before, value, "Balance of retailer did not decrease correctly");
})

it('can ship tofu', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Our next bean";
    tofuSku = tofuSku + 1;
    let tofuName = "Our next tofu";
    let tofuPrice = Web3Utils.toWei(".02", "ether");
    let soyBalance = Web3Utils.toWei(".05", "ether");
    let tofuBalance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: soyBalance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    await instance.deliverSoy(soySku, {from: distributor});
    await instance.makeTofu(tofuName, soySku, tofuPrice, {from: tofuCompany});
    await instance.orderTofu(tofuSku, {from: retailer, value: tofuBalance});
    await instance.shipTofu(tofuSku, {from: tofuCompany});

    let myTofu = await instance.getTofu.call(tofuSku);
    assert.equal(myTofu.state, tofuStateEnum.ReadyForShipping, "Could not ship tofu");
})

// Testing two functionalities in one test in order to reduce code duplication
it('can fetch and deliver tofu', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Our bright bean";
    tofuSku = tofuSku + 1;
    let tofuName = "Our delicious tofu";
    let tofuPrice = Web3Utils.toWei(".02", "ether");
    let soyBalance = Web3Utils.toWei(".05", "ether");
    let tofuBalance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: soyBalance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    await instance.deliverSoy(soySku, {from: distributor});
    await instance.makeTofu(tofuName, soySku, tofuPrice, {from: tofuCompany});
    await instance.orderTofu(tofuSku, {from: retailer, value: tofuBalance});
    await instance.shipTofu(tofuSku, {from: tofuCompany});
    await instance.fetchTofu(tofuSku, {from: distributor});

    let myTofu = await instance.getTofu.call(tofuSku);
    assert.equal(myTofu.state, tofuStateEnum.Shipping, "Could not fetch tofu");
    assert.equal(myTofu.distributor, distributor, "Could not assign distributor correctly");

    await instance.deliverTofu(tofuSku, {from: distributor});

    let myTofu2 = await instance.getTofu.call(tofuSku);
    assert.equal(myTofu2.state, tofuStateEnum.Delivered, "Could not deliver tofu");
})

it('can put tofu on sale', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Our bright bean";
    tofuSku = tofuSku + 1;
    let tofuName = "Our delicious tofu";
    let tofuPrice = Web3Utils.toWei(".02", "ether");
    let soyBalance = Web3Utils.toWei(".05", "ether");
    let tofuBalance = Web3Utils.toWei(".05", "ether");
    let tofuRetailPrice = Web3Utils.toWei(".04", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: soyBalance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    await instance.deliverSoy(soySku, {from: distributor});
    await instance.makeTofu(tofuName, soySku, tofuPrice, {from: tofuCompany});
    await instance.orderTofu(tofuSku, {from: retailer, value: tofuBalance});
    await instance.shipTofu(tofuSku, {from: tofuCompany});
    await instance.fetchTofu(tofuSku, {from: distributor});
    await instance.deliverTofu(tofuSku, {from: distributor});
    await instance.putTofuOnSale(tofuSku, tofuRetailPrice, {from:retailer});

    let myTofu = await instance.getTofu.call(tofuSku);
    assert.equal(myTofu.state, tofuStateEnum.OnSale, "Could not put tofu on sale");
    assert.equal(myTofu.price, tofuRetailPrice, "Could not assign retail price to tofu");
})



it('can buy tofu and adjusts balances correctly', async() => {
    let instance = await TofuSupplyChain.deployed();
    soySku = soySku + 1;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Our best bean";
    tofuSku = tofuSku + 1;
    let tofuName = "Our new tofu";
    let tofuPrice = Web3Utils.toWei(".02", "ether");
    let tofuRetailPrice = Web3Utils.toWei(".04", "ether");
    let soyBalance = Web3Utils.toWei(".05", "ether");
    let tofuBalance = Web3Utils.toWei(".05", "ether");
    let tofuRetailBalance = Web3Utils.toWei(".05", "ether");
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    await instance.harvestSoy(soySku, {from: farmer});
    await instance.orderSoy(soySku, {from: tofuCompany, value: soyBalance});
    await instance.shipSoy(soySku, {from: farmer});
    await instance.fetchSoy(soySku, {from: distributor});
    await instance.deliverSoy(soySku, {from: distributor});
    await instance.makeTofu(tofuName, soySku, tofuPrice, {from: tofuCompany});
    await instance.orderTofu(tofuSku, {from: retailer, value: tofuBalance});
    await instance.shipTofu(tofuSku, {from: tofuCompany});
    await instance.fetchTofu(tofuSku, {from: distributor});
    await instance.deliverTofu(tofuSku, {from: distributor});
    await instance.putTofuOnSale(tofuSku, tofuRetailPrice, {from:retailer});
    let balanceRetailer_before = await web3.eth.getBalance(retailer);
    let balanceCustomer_before = await web3.eth.getBalance(customer);
    let receipt = await instance.buyTofu(tofuSku, {from: customer, value: tofuRetailBalance});
    let balanceRetailer_after = await web3.eth.getBalance(retailer);
    let balanceCustomer_after = await web3.eth.getBalance(customer);

    // Calculating amount paid for gas: adapted from Ismael: https://ethereum.stackexchange.com/a/42175
    const gasUsed = BigNumber(receipt.receipt.gasUsed);
    const tx = await web3.eth.getTransaction(receipt.tx);
    let gasPrice = BigNumber(tx.gasPrice);
    let gasFee = gasPrice * gasUsed;


    let value = BigNumber(balanceCustomer_after).plus(gasFee).plus(BigNumber(tofuRetailPrice));

    assert.equal(balanceRetailer_after, Number(BigNumber(balanceRetailer_before).plus(BigNumber(tofuRetailPrice))), "Balance of retailer did not increase correctly");
    assert.equal(balanceCustomer_before, value, "Balance of customer did not decrease correctly");

    let myTofu = await instance.getTofu.call(tofuSku);
    assert.equal(myTofu.state, tofuStateEnum.Sold, "Could not sell tofu");
    assert.equal(myTofu.buyer, customer, "Could not hand over tofu to customer");
})
