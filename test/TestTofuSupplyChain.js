const TofuSupplyChain = artifacts.require("TofuSupplyChain");
const BigNumber = require('bignumber.js');

let accounts;
let owner;
let farmer;
let tofuCompany;
let distributor;
let retailer;
let customer;

// For these tests, the following roles apply:
// accounts[0]: owner and farmer
// accounts[1]: tofu company
// accounts[2]: distributor
// accounts[3]: retailer
// accounts[4]: final customer

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
    let soySku = 1;
    let instance = await TofuSupplyChain.deployed();
    await instance.plantSoy('New bean', soySku, {from: accounts[0]})
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.name, 'New bean', "Soy not planted properly")
})

it ('can check soy', async() => {
    let soySku = 2;
    let instance = await TofuSupplyChain.deployed();
    await instance.plantSoy('Bean 2', soySku, {from: accounts[0]})
    await instance.checkSoy(soySku)
    let mySoy = await instance.getSoy.call(soySku);
    assert.equal(mySoy.state, soyStateEnum.Ripe, "Soy has not riped correctly")
})





