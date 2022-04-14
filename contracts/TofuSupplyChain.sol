// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// Define the contract 'TofuSupplyChain'
contract TofuSupplyChain {
    // Holds all functions and structs

    address owner;
    uint skuCountSoy;
    uint skuCountTofu;

    // Enums for soy/tofu states
    enum soyState {Planted, Ripe, Harvested, Ordered, ReadyForShipping, Shipping, Delivered, Used}
    enum tofuState {Produced, Ordered, ReadyForShipping, Shipping, Delivered, OnSale, Sold}

    // Soy. name, sku, price, state, seller, buyer
    struct Soy {
        string  name;
        uint  sku;
        uint  price;
        soyState  state;
        address  seller;        // Farmer
        address distributor;
        address  buyer;         // Tofu Company
        uint toTofuSku;
    }

    // Tofu. name, sku, price, state, seller, buyer
    struct Tofu {
        string  name;
        uint  sku;
        uint  price;
        tofuState  state;
        address  producer;      // Tofu Company
        address  distributor;
        address retailer;
        address buyer;          // Final customer in retail store
        uint fromSoySku;
    }

    // Map the SKU to a unit of soy/tofu.
    mapping (uint => Soy) soys;
    mapping (uint => Tofu) tofus;

    // Events
    event Harvested(uint sku);
    event Produced(uint sku);
    event ReadyForShipping(uint sku);
    event Delivered(uint sku);
    event OnSale(uint sku);
    event Sold(uint sku);

    constructor() payable {
        owner = msg.sender;
        skuCountSoy = 0;
        skuCountTofu = 100;
    }

    // Get soy info
    function getSoy(uint _soySku) public view returns (Soy memory) {
        Soy memory queriedSoy = soys[_soySku];
        require(keccak256(bytes(queriedSoy.name)) != keccak256(bytes("")), "Queried soy info for nonexistent SKU"); // Thanks to Greg Mikeska: https://ethereum.stackexchange.com/a/11754
        return queriedSoy;
    }

    // Get tofu info
    function getTofu(uint _tofuSku) public view returns (Tofu memory) {
        Tofu memory queriedTofu = tofus[_tofuSku];
        require(keccak256(bytes(queriedTofu.name)) != keccak256(bytes("")), "Queried tofu info for nonexistent SKU"); // Thanks to Greg Mikeska: https://ethereum.stackexchange.com/a/11754
        return queriedTofu;
    }


    // See if msg.sender == owner of the contract
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // Verify the Caller
    modifier verifyCaller (address _address) {
        require(msg.sender == _address, "The message sender is not the expected address");
        _;
    }

    // Check if the paid amount is sufficient to cover the price
    modifier paidEnough(uint _price) {
        require(msg.value >= _price, "The message does not contain enough Ether");
        _;
    }

    // Check if a unit of soy has a certain state
    modifier checkSoyState(uint _sku, soyState _state) {
        require(soys[_sku].state == _state, "The soy state is not correct");
        _;
    }

    // Check if a unit of tofu has a certain state
    modifier checkTofuState(uint _sku, tofuState _state) {
        require(tofus[_sku].state == _state, "The tofu state is not correct");
        _;
    }

    // Checks the price and refunds the remaining balance
    modifier checkSoyValue(uint _sku) {
        _;
        uint _price = soys[_sku].price;
        uint amountToRefund = msg.value - _price;
        address payable buyerAddressPayable = _make_payable(soys[_sku].buyer);
        buyerAddressPayable.transfer(amountToRefund);
    }

    modifier checkTofuValue(uint _sku) {
        _;
        uint _price = tofus[_sku].price;
        uint amountToRefund = msg.value - _price;
        
        /* // Not useful since retailer and buyer are two entities to whom this modifier appliers (buy from farmer vs. buy from retailer)
        address payable buyerAddressPayable = _make_payable(tofus[_sku].buyer);
        buyerAddressPayable.transfer(amountToRefund);
        */
        address payable senderAddressPayable = _make_payable(msg.sender);
        senderAddressPayable.transfer(amountToRefund);
        
    }

    // Function that allows you to convert an address into a payable address
    function _make_payable(address x) internal pure returns (address payable) {
        return payable(x); // According to k06a's answer: https://ethereum.stackexchange.com/a/65694
    }

    function plantSoy(string memory _name, uint _price) public {
        // Increment sku
        skuCountSoy = skuCountSoy + 1;

        // Add the new soy into inventory and mark it as planted
        soys[skuCountSoy] = Soy(
            {
                name: _name, 
                sku: skuCountSoy, 
                price: _price, 
                state: soyState.Planted, 
                seller: msg.sender, 
                distributor: address(0),
                buyer: address(0), 
                toTofuSku: 0
            });
    }

    // When checking the soy, the farmer finds out that the soy is ripe (because of their experience, farmers don't check their soy prematurely)
    function checkSoy(uint _sku) public 
        verifyCaller(soys[_sku].seller) {
        
        soys[_sku].state = soyState.Ripe;
    }

    // The farmers have to harvest their soy
    function harvestSoy(uint _sku) public 
        verifyCaller(soys[_sku].seller) {
        // Emit event to notify potential buyers
        emit Harvested(_sku);

        soys[_sku].state = soyState.Harvested;
    }

    // orderSoy allows to order one unit of soy from the farmer
    function orderSoy(uint _sku) public payable
        // Call modifier to check if sku is for sale
        checkSoyState(_sku, soyState.Harvested)
        // Call modifer to check if buyer has paid enough
        paidEnough(soys[_sku].price)
        // Call modifer to send any excess ether back to buyer
        checkSoyValue(_sku) {

        address buyer = msg.sender;
        uint  price = soys[_sku].price;
        // Update buyer
        soys[_sku].buyer = buyer;
        // Update state
        soys[_sku].state = soyState.Ordered;
        // Transfer money to seller
        address payable sellerAddressPayable = _make_payable(soys[_sku].seller);
        sellerAddressPayable.transfer(price);
        // emit the appropriate event
        emit Sold(_sku);
    }

    // The farmer has to ship the soy
    function shipSoy(uint _sku) public 
        checkSoyState(_sku, soyState.Ordered) 
        verifyCaller(soys[_sku].seller) {

        soys[_sku].state = soyState.ReadyForShipping;

        emit ReadyForShipping(_sku);
    }

    function fetchSoy(uint _sku) public
        checkSoyState(_sku, soyState.ReadyForShipping) {

        soys[_sku].distributor = msg.sender;
        soys[_sku].state = soyState.Shipping;
    }

    function deliverSoy(uint _sku) public 
        checkSoyState(_sku, soyState.Shipping)
        verifyCaller(soys[_sku].distributor) {

        soys[_sku].state = soyState.Delivered;

        emit Delivered(_sku);
        
    }

    // The tofu company calls makeTofu whenever they produce a unit of tofu from soy
    function makeTofu(string memory _name, uint _soySku, uint _price) public 
        checkSoyState(_soySku, soyState.Delivered) 
        verifyCaller(soys[_soySku].buyer) {
        // Increment sku for tofu
        skuCountTofu = skuCountTofu + 1;

        soys[_soySku].state = soyState.Used;
        soys[_soySku].toTofuSku = skuCountTofu;

        // Add newly produced tofu and link it to soy it came from
        tofus[skuCountTofu] = Tofu(
            {
                name: _name, 
                sku: skuCountTofu, 
                price: _price, 
                state: tofuState.Produced, 
                producer: msg.sender, 
                distributor: address(0), 
                retailer: address(0), 
                buyer: address(0), 
                fromSoySku: _soySku
            });
        // Emit event
        emit Produced(skuCountTofu);
    }

    // The retailer can order tofu using orderTofu()
    function orderTofu(uint _sku) public payable 
        checkTofuState(_sku, tofuState.Produced)
        paidEnough(tofus[_sku].price)  
        checkTofuValue(_sku) {
        
        address retailer = msg.sender;
        uint price = tofus[_sku].price;
        // Update retailer
        tofus[_sku].retailer = retailer;
        // Update state
        tofus[_sku].state = tofuState.Ordered;
        // Transfer money to seller
        address payable producerAddressPayable = _make_payable(tofus[_sku].producer);
        producerAddressPayable.transfer(price);
    }

    // The tofu company has to ship the tofu
    function shipTofu(uint _sku) public 
        checkTofuState(_sku, tofuState.Ordered) 
        verifyCaller(tofus[_sku].producer) {

        tofus[_sku].state = tofuState.ReadyForShipping;

        emit ReadyForShipping(_sku);
    }

    function fetchTofu(uint _sku) public
        checkTofuState(_sku, tofuState.ReadyForShipping)
        {

        tofus[_sku].distributor = msg.sender;
        tofus[_sku].state = tofuState.Shipping;
    }

    function deliverTofu(uint _sku) public 
        checkTofuState(_sku, tofuState.Shipping)
        verifyCaller(tofus[_sku].distributor) {

        tofus[_sku].state = tofuState.Delivered;

        emit Delivered(_sku);
        
    }

    function putTofuOnSale(uint _sku, uint _price) public 
        checkTofuState(_sku, tofuState.Delivered)
        verifyCaller(tofus[_sku].retailer) {

        tofus[_sku].state = tofuState.OnSale;
        tofus[_sku].price = _price;

        emit OnSale(_sku);
    }

    // buyTofu allows to buy one unit of tofu from the retailer
    function buyTofu(uint _sku) public payable
        // Call modifier to check if sku is for sale
        checkTofuState(_sku, tofuState.OnSale)
        // Call modifer to check if buyer has paid enough
        paidEnough(tofus[_sku].price)
        // Call modifer to send any excess ether back to buyer
        checkTofuValue(_sku) {

        address buyer = msg.sender;
        uint  price = tofus[_sku].price;
        // Update buyer
        tofus[_sku].buyer = buyer;
        // Update state
        tofus[_sku].state = tofuState.Sold;
        // Transfer money to seller
        address payable retailerAddressPayable = _make_payable(tofus[_sku].retailer);
        retailerAddressPayable.transfer(price);
        // emit the appropriate event
        emit Sold(_sku);
    }
}
