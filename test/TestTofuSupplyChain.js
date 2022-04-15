const SupplyChain = artifacts.require("SupplyChain");
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

// From SupplyChain.sol
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

// From SupplyChain.sol
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


// Variables to test the whole process end-to-end without copy & pasting too much with each test
let soyName = "First bean";
let soyPrice = Web3Utils.toWei(".01", "ether");
let soyUpc = 1234;
let soyLat = "49.434831594";
let soyLong = "0.271332248";
let tofuName = "Our best tofu";
let tofuUpc = 4321;
let tofuLat = "48.8583";
let tofuLong = "2.2945";
let tofuPrice = Web3Utils.toWei(".02", "ether");
let tofuRetailPrice = Web3Utils.toWei(".04", "ether");

contract('SupplyChain', (accs) => {
    accounts = accs;
    owner = accounts[0];

    farmer = accounts[0];
    tofuCompany = accounts[1];
    distributor = accounts[2];
    retailer = accounts[3];
    customer = accounts[4];
})

it('can plant soy', async() => {
    let instance = await SupplyChain.deployed();
    soySku = soySku + 1;
    await instance.plantSoy(soyName, soyUpc, soyPrice, soyLat, soyLong, {from: farmer});
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy.name, soyName, "Soy not planted properly");
    assert.equal(mySoy.price, soyPrice, "Soy price not assigned correctly");
    assert.equal(mySoy.farmer, farmer, "Soy farmer not attributed correctly");
})


it ('can check soy', async() => {
    let instance = await SupplyChain.deployed();
    await instance.checkSoy(soyUpc, {from: farmer});
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy.state, soyStateEnum.Ripe, "Soy has not riped correctly");
})

it ('can harvest soy', async() => {
    let instance = await SupplyChain.deployed();
    await instance.harvestSoy(soyUpc, {from: farmer});
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy.state, soyStateEnum.Harvested, "Could not harvest soy");

})

it ('can order soy and adjusts balances correctly', async() => {
    let instance = await SupplyChain.deployed();
    let balance = Web3Utils.toWei(".05", "ether");
    let balanceBuyer_before = await web3.eth.getBalance(tofuCompany);
    let balanceSeller_before = await web3.eth.getBalance(farmer);
    let receipt = await instance.orderSoy(soyUpc, {from: tofuCompany, value: balance});
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

    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy.state, soyStateEnum.Ordered, "Could not order soy");
    assert.equal(mySoy.buyer, tofuCompany, "Soy buyer not assigned properly");
})

it('can ship soy', async() => {
    let instance = await SupplyChain.deployed();
    await instance.shipSoy(soyUpc, {from: farmer});
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy.state, soyStateEnum.ReadyForShipping, "Could not ship soy");
})

it('can fetch soy', async() => {
    let instance = await SupplyChain.deployed();
    await instance.fetchSoy(soyUpc, {from: distributor});
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy.state, soyStateEnum.Shipping, "Could not fetch soy");
    assert.equal(mySoy.distributor, distributor, "Distributor not assignd properly");
})

it('can deliver soy', async() => {
    let instance = await SupplyChain.deployed();
    await instance.deliverSoy(soyUpc, {from: distributor});
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy.state, soyStateEnum.Delivered, "Could not deliver soy");
})

it('can make tofu', async() => {
    let instance = await SupplyChain.deployed();
    await instance.makeTofu(tofuName, soyUpc, tofuUpc, tofuPrice, tofuLat, tofuLong, {from: tofuCompany});

    let mySoy = await instance.getSoy.call(soyUpc);
    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(mySoy.state, soyStateEnum.Used, "Could not use soy");
    assert.equal(mySoy.toTofuUpc, tofuUpc, "Could not link soy to yielded tofu upc");
    assert.equal(myTofu.state, tofuStateEnum.Produced, "Could not produce tofu");
    assert.equal(myTofu.price, tofuPrice, "Could not add price information for tofu");
    assert.equal(myTofu.name, tofuName, "Could not add tofu name");
    assert.equal(myTofu.producer, tofuCompany, "Could not add tofu producer");
    assert.equal(myTofu.fromSoyUpc, soyUpc, "Could not link tofu to original soy upc");
})

it('can order tofu', async() => {
    let instance = await SupplyChain.deployed();
    let tofuBalance = Web3Utils.toWei(".05", "ether");
    let balanceRetailer_before = await web3.eth.getBalance(retailer);
    let balanceProducer_before = await web3.eth.getBalance(tofuCompany);
    let receipt = await instance.orderTofu(tofuUpc, {from: retailer, value: tofuBalance});
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

    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu.state, tofuStateEnum.Ordered, "Could not order tofu");
    assert.equal(myTofu.retailer, retailer, "Could not assign retailer properly");
})

it('can ship tofu', async() => {
    let instance = await SupplyChain.deployed();
    await instance.shipTofu(tofuUpc, {from: tofuCompany});

    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu.state, tofuStateEnum.ReadyForShipping, "Could not ship tofu");
})

// Testing two functionalities in one test in order to reduce complexity
it('can fetch and deliver tofu', async() => {
    let instance = await SupplyChain.deployed();
    await instance.fetchTofu(tofuUpc, {from: distributor});

    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu.state, tofuStateEnum.Shipping, "Could not fetch tofu");
    assert.equal(myTofu.distributor, distributor, "Could not assign distributor correctly");

    await instance.deliverTofu(tofuUpc, {from: distributor});

    let myTofu2 = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu2.state, tofuStateEnum.Delivered, "Could not deliver tofu");
})

it('can put tofu on sale', async() => {
    let instance = await SupplyChain.deployed();
    await instance.putTofuOnSale(tofuUpc, tofuRetailPrice, {from:retailer});

    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu.state, tofuStateEnum.OnSale, "Could not put tofu on sale");
    assert.equal(myTofu.price, tofuRetailPrice, "Could not assign retail price to tofu");
})



it('can buy tofu and adjusts balances correctly', async() => {
    let instance = await SupplyChain.deployed();
    let tofuRetailBalance = Web3Utils.toWei(".05", "ether");

    let balanceRetailer_before = await web3.eth.getBalance(retailer);
    let balanceCustomer_before = await web3.eth.getBalance(customer);
    let receipt = await instance.buyTofu(tofuUpc, {from: customer, value: tofuRetailBalance});
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

    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu.state, tofuStateEnum.Sold, "Could not sell tofu");
    assert.equal(myTofu.buyer, customer, "Could not hand over tofu to customer");
})
