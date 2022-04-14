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
    let soySku = 1;
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
    let soySku = 2;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let soyName = "Bean two";
    await instance.plantSoy(soyName, soyPrice, {from: farmer});
    await instance.checkSoy(soySku, {from: farmer});
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.state, soyStateEnum.Ripe, "Soy has not riped correctly");
})

it ('can harvest soy', async() => {
    let instance = await TofuSupplyChain.deployed();
    let soySku = 3;
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
    let soySku = 4;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let balance = Web3Utils.toWei(".05", "ether");
    let soyName = "Best bean";
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
    let soySku = 5;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let balance = Web3Utils.toWei(".05", "ether");
    let soyName = "Excelent bean";
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
    let soySku = 6;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let balance = Web3Utils.toWei(".05", "ether");
    let soyName = "Awesome bean";
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
    let soySku = 7;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let balance = Web3Utils.toWei(".05", "ether");
    let soyName = "Awesome bean2";
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
    let soySku = 8;
    let soyPrice = Web3Utils.toWei(".01", "ether");
    let balance = Web3Utils.toWei(".05", "ether");
    let soyName = "Next great bean";
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



