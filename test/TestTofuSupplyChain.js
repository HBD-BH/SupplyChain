const SupplyChain = artifacts.require("SupplyChain");
const BigNumber = require('bignumber.js');
const Web3Utils = require('web3-utils');
const truffleAssert = require('truffle-assertions')

let accounts;
let owner_admin;
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
// accounts[0]: owner/admin
// accounts[1]: farmer
// accounts[2]: tofu company
// accounts[3]: distributor
// accounts[4]: retailer
// accounts[5]: final customer


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
    owner_admin = accounts[0];

    farmer = accounts[1];
    tofuCompany = accounts[2];
    distributor = accounts[3];
    retailer = accounts[4];
    customer = accounts[5];

it('can grant roles', async() =>{
    let instance = await SupplyChain.deployed();

    // Grant farmer role
    await instance.addRole("FARMER", farmer, {from: owner_admin});
    assert.equal(await instance.isRole("FARMER", farmer), true, "Did not assign farmer role properly");

    // Grant tofu producer role
    await instance.addRole("TOFUPRODUCER", tofuCompany, {from: owner_admin});
    assert.equal(await instance.isRole("TOFUPRODUCER", tofuCompany), true, "Did not assign tofu producer role properly");

    // Grant distributor role
    await instance.addRole("DISTRIBUTOR", distributor, {from: owner_admin});
    assert.equal(await instance.isRole("DISTRIBUTOR", distributor), true, "Did not assign distributor role properly");

    // Grant retailer role
    await instance.addRole("RETAILER", retailer, {from: owner_admin});
    assert.equal(await instance.isRole("RETAILER", retailer), true, "Did not assign retailer role properly");

    // Grant customer role
    await instance.addRole("CUSTOMER", customer, {from: owner_admin});
    assert.equal(await instance.isRole("CUSTOMER", customer), true, "Did not assign customer role properly");
})

it('can plant soy', async() => {
    let instance = await SupplyChain.deployed();


    soySku = soySku + 1;
    await instance.plantSoy(soyName, soyUpc, soyPrice, soyLat, soyLong, {from: farmer});
    // getSoy returns  0     1    2      3      4       5          6           7            8      9
    // getSoy returns (name, sku, price, state, farmer, originLat, originLong, distributor, buyer, toTofuUpc)
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy[0], soyName, "Soy not planted properly");
    assert.equal(mySoy[2], soyPrice, "Soy price not assigned correctly");
    assert.equal(mySoy[4], farmer, "Soy farmer not attributed correctly");
})


it('can check soy', async() => {
    let instance = await SupplyChain.deployed();
    await instance.checkSoy(soyUpc, {from: farmer});
    // getSoy returns  0     1    2      3      4       5          6           7            8      9
    // getSoy returns (name, sku, price, state, farmer, originLat, originLong, distributor, buyer, toTofuUpc)
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy[3], soyStateEnum.Ripe, "Soy has not riped correctly");
})

it('can harvest soy', async() => {
    let instance = await SupplyChain.deployed();
    let result = await instance.harvestSoy(soyUpc, {from: farmer});
    // getSoy returns  0     1    2      3      4       5          6           7            8      9
    // getSoy returns (name, sku, price, state, farmer, originLat, originLong, distributor, buyer, toTofuUpc)
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy[3], soyStateEnum.Harvested, "Could not harvest soy");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(result, 'Harvested');

})

it('can order soy and adjusts balances correctly', async() => {
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
    assert.equal(balanceBuyer_before, Number(value), "Balance of buyer did not decrease correctly");

    // getSoy returns  0     1    2      3      4       5          6           7            8      9
    // getSoy returns (name, sku, price, state, farmer, originLat, originLong, distributor, buyer, toTofuUpc)
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy[3], soyStateEnum.Ordered, "Could not order soy");
    assert.equal(mySoy[8], tofuCompany, "Soy buyer not assigned properly");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(receipt, 'Sold');

})

it('can ship soy', async() => {
    let instance = await SupplyChain.deployed();
    let receipt = await instance.shipSoy(soyUpc, {from: farmer});
    // getSoy returns  0     1    2      3      4       5          6           7            8      9
    // getSoy returns (name, sku, price, state, farmer, originLat, originLong, distributor, buyer, toTofuUpc)
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy[3], soyStateEnum.ReadyForShipping, "Could not ship soy");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(receipt, 'ReadyForShipping');
})

it('can fetch soy', async() => {
    let instance = await SupplyChain.deployed();
    await instance.fetchSoy(soyUpc, {from: distributor});
    // getSoy returns  0     1    2      3      4       5          6           7            8      9
    // getSoy returns (name, sku, price, state, farmer, originLat, originLong, distributor, buyer, toTofuUpc)
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy[3], soyStateEnum.Shipping, "Could not fetch soy");
    assert.equal(mySoy[7], distributor, "Distributor not assignd properly");
})

it('can deliver soy', async() => {
    let instance = await SupplyChain.deployed();
    let receipt = await instance.deliverSoy(soyUpc, {from: distributor});
    // getSoy returns  0     1    2      3      4       5          6           7            8      9
    // getSoy returns (name, sku, price, state, farmer, originLat, originLong, distributor, buyer, toTofuUpc)
    let mySoy = await instance.getSoy.call(soyUpc);
    assert.equal(mySoy[3], soyStateEnum.Delivered, "Could not deliver soy");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(receipt, 'Delivered');
})

it('can make tofu', async() => {
    let instance = await SupplyChain.deployed();
    let receipt = await instance.makeTofu(tofuName, soyUpc, tofuUpc, tofuPrice, tofuLat, tofuLong, {from: tofuCompany});

    // getSoy returns  0     1    2      3      4       5          6           7            8      9
    // getSoy returns (name, sku, price, state, farmer, originLat, originLong, distributor, buyer, toTofuUpc)
    let mySoy = await instance.getSoy.call(soyUpc);
    // getTofu returns  0     1    2      3      4         5               6                7            8         9      10
    // getTofu returns (name, sku, price, state, producer, originLatitude, originLongitude, distributor, retailer, buyer, fromSoyUpc)
    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(mySoy[3], soyStateEnum.Used, "Could not use soy");
    assert.equal(mySoy[9], tofuUpc, "Could not link soy to yielded tofu upc");
    assert.equal(myTofu[3], tofuStateEnum.Produced, "Could not produce tofu");
    assert.equal(myTofu[2], tofuPrice, "Could not add price information for tofu");
    assert.equal(myTofu[0], tofuName, "Could not add tofu name");
    assert.equal(myTofu[4], tofuCompany, "Could not add tofu producer");
    assert.equal(myTofu[10], soyUpc, "Could not link tofu to original soy upc");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(receipt, 'Produced');
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
    assert.equal(balanceRetailer_before, Number(value), "Balance of retailer did not decrease correctly");

    // getTofu returns  0     1    2      3      4         5               6                7            8         9      10
    // getTofu returns (name, sku, price, state, producer, originLatitude, originLongitude, distributor, retailer, buyer, fromSoyUpc)
    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu[3], tofuStateEnum.Ordered, "Could not order tofu");
    assert.equal(myTofu[8], retailer, "Could not assign retailer properly");
})

it('can ship tofu', async() => {
    let instance = await SupplyChain.deployed();
    let receipt = await instance.shipTofu(tofuUpc, {from: tofuCompany});

    // getTofu returns  0     1    2      3      4         5               6                7            8         9      10
    // getTofu returns (name, sku, price, state, producer, originLatitude, originLongitude, distributor, retailer, buyer, fromSoyUpc)
    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu[3], tofuStateEnum.ReadyForShipping, "Could not ship tofu");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(receipt, 'ReadyForShipping');
})

// Testing two functionalities in one test in order to reduce complexity
it('can fetch and deliver tofu', async() => {
    let instance = await SupplyChain.deployed();
    await instance.fetchTofu(tofuUpc, {from: distributor});

    // getTofu returns  0     1    2      3      4         5               6                7            8         9      10
    // getTofu returns (name, sku, price, state, producer, originLatitude, originLongitude, distributor, retailer, buyer, fromSoyUpc)
    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu[3], tofuStateEnum.Shipping, "Could not fetch tofu");
    assert.equal(myTofu[7], distributor, "Could not assign distributor correctly");

    let receipt = await instance.deliverTofu(tofuUpc, {from: distributor});

    // getTofu returns  0     1    2      3      4         5               6                7            8         9      10
    // getTofu returns (name, sku, price, state, producer, originLatitude, originLongitude, distributor, retailer, buyer, fromSoyUpc)
    let myTofu2 = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu2.state, tofuStateEnum.Delivered, "Could not deliver tofu");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(receipt, 'Delivered');
})

it('can put tofu on sale', async() => {
    let instance = await SupplyChain.deployed();
    let receipt = await instance.putTofuOnSale(tofuUpc, tofuRetailPrice, {from:retailer});

    // getTofu returns  0     1    2      3      4         5               6                7            8         9      10
    // getTofu returns (name, sku, price, state, producer, originLatitude, originLongitude, distributor, retailer, buyer, fromSoyUpc)
    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu[3], tofuStateEnum.OnSale, "Could not put tofu on sale");
    assert.equal(myTofu[2], tofuRetailPrice, "Could not assign retail price to tofu");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(receipt, 'OnSale');
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
    assert.equal(balanceCustomer_before, Number(value), "Balance of customer did not decrease correctly");

    // getTofu returns  0     1    2      3      4         5               6                7            8         9      10
    // getTofu returns (name, sku, price, state, producer, originLatitude, originLongitude, distributor, retailer, buyer, fromSoyUpc)
    let myTofu = await instance.getTofu.call(tofuUpc);
    assert.equal(myTofu[3], tofuStateEnum.Sold, "Could not sell tofu");
    assert.equal(myTofu[9], customer, "Could not hand over tofu to customer");
    // Check for appropriate event emitted
    truffleAssert.eventEmitted(receipt, 'Sold');
})

it('can revoke roles', async() =>{
    let instance = await SupplyChain.deployed();

    // Grant farmer role
    await instance.removeRole("FARMER", farmer, {from: owner_admin});
    assert.equal(await instance.isRole("FARMER", farmer), false, "Did not remove farmer role properly");

    // Grant tofu producer role
    await instance.removeRole("TOFUPRODUCER", tofuCompany, {from: owner_admin});
    assert.equal(await instance.isRole("TOFUPRODUCER", tofuCompany), false, "Did not remove tofu producer role properly");

    // Grant distributor role
    await instance.removeRole("DISTRIBUTOR", distributor, {from: owner_admin});
    assert.equal(await instance.isRole("DISTRIBUTOR", distributor), false, "Did not remove distributor role properly");

    // Grant retailer role
    await instance.removeRole("DISTRIBUTOR", retailer, {from: owner_admin});
    assert.equal(await instance.isRole("DISTRIBUTOR", retailer), false, "Did not remove retailer role properly");

    // Grant customer role
    await instance.removeRole("CUSTOMER", customer, {from: owner_admin});
    assert.equal(await instance.isRole("CUSTOMER", customer), false, "Did not remove customer role properly");
})


});

