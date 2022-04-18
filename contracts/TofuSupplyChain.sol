// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Define the contract 'SupplyChain'
contract SupplyChain is AccessControl, Ownable {
    // Holds all functions and structs

    //address owner;
    uint skuCountSoy;
    uint skuCountTofu;

    // Roles within the tofu supply chain
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant TOFUPRODUCER_ROLE = keccak256("TOFUPRODUCER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant CUSTOMER_ROLE = keccak256("CUSTOMER_ROLE");

    // Enums for soy/tofu states
    enum soyState {Planted, Ripe, Harvested, Ordered, ReadyForShipping, Shipping, Delivered, Used}
    enum tofuState {Produced, Ordered, ReadyForShipping, Shipping, Delivered, OnSale, Sold}

    // Soy. name, upc, price, state, seller, buyer
    struct Soy {
        string  name;
        uint  upc;
        uint sku;
        uint  price;
        soyState  state;
        address  farmer;       
        string originLatitude;
        string originLongitude;
        address distributor;
        address  buyer;         // Tofu Company
        uint toTofuUpc;
    }

    // Tofu. name, upc, price, state, seller, buyer
    struct Tofu {
        string  name;
        uint  upc;
        uint sku;
        uint  price;
        tofuState  state;
        address  producer;      // Tofu Company
        string originLatitude;
        string originLongitude;
        address  distributor;
        address retailer;
        address buyer;          // Final customer in retail store
        uint fromSoyUpc;
    }

    // Map the UPC to a unit of soy/tofu.
    mapping (uint => Soy) soys;
    mapping (uint => Tofu) tofus;

    // Events
    event Harvested(uint upc);
    event Produced(uint upc);
    event ReadyForShipping(uint upc);
    event Delivered(uint upc);
    event OnSale(uint upc);
    event Sold(uint upc);

    constructor() payable {
        //owner = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        skuCountSoy = 0;
        skuCountTofu = 100;
    }

    // Get soy info 
    function getSoy(uint _soyUpc) public view returns (
        string memory  name,
        uint sku,
        uint  price,
        soyState  state,
        address  farmer,       
        string memory originLatitude,
        string memory originLongitude,
        address distributor,
        address  buyer,         
        uint toTofuUpc
    ) {
        Soy memory queriedSoy = soys[_soyUpc];
        require(keccak256(bytes(queriedSoy.name)) != keccak256(bytes("")), "Queried soy info for nonexistent UPC"); // Thanks to Greg Mikeska: https://ethereum.stackexchange.com/a/11754
        return (
            name = queriedSoy.name,
            sku = queriedSoy.sku,
            price = queriedSoy.price,
            state = queriedSoy.state,
            farmer = queriedSoy.farmer,
            originLatitude = queriedSoy.originLatitude,
            originLongitude = queriedSoy.originLongitude,
            distributor = queriedSoy.distributor,
            buyer = queriedSoy.buyer,
            toTofuUpc = queriedSoy.toTofuUpc
        );
    }

    // Get tofu info 
    function getTofu(uint _tofuUpc) public view returns (
            string memory name,
            uint sku,
            uint  price,
            tofuState  state,
            address  producer,      
            string memory originLatitude,
            string memory originLongitude,
            address  distributor,
            address retailer,
            address buyer,          
            uint fromSoyUpc
        ) {
        Tofu memory queriedTofu = tofus[_tofuUpc];
        require(keccak256(bytes(queriedTofu.name)) != keccak256(bytes("")), "Queried tofu info for nonexistent UPC"); // Thanks to Greg Mikeska: https://ethereum.stackexchange.com/a/11754
        return (
            name = queriedTofu.name,
            sku = queriedTofu.sku,
            price = queriedTofu.price,
            state = queriedTofu.state,
            producer = queriedTofu.producer,
            originLatitude = queriedTofu.originLatitude,
            originLongitude = queriedTofu.originLongitude,
            distributor = queriedTofu.distributor,
            retailer = queriedTofu.retailer,
            buyer = queriedTofu.buyer,
            fromSoyUpc = queriedTofu.fromSoyUpc
        );
    }


    // See if msg.sender == owner of the contract
    /*
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }
    */

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
    modifier checkSoyState(uint _upc, soyState _state) {
        require(soys[_upc].state == _state, "The soy state is not correct");
        _;
    }

    // Check if a unit of tofu has a certain state
    modifier checkTofuState(uint _upc, tofuState _state) {
        require(tofus[_upc].state == _state, "The tofu state is not correct");
        _;
    }

    // Checks the price and refunds the remaining balance
    modifier checkSoyValue(uint _upc) {
        _;
        uint _price = soys[_upc].price;
        uint amountToRefund = msg.value - _price;
        address payable buyerAddressPayable = _make_payable(soys[_upc].buyer);
        buyerAddressPayable.transfer(amountToRefund);
    }

    modifier checkTofuValue(uint _upc) {
        _;
        uint _price = tofus[_upc].price;
        uint amountToRefund = msg.value - _price;
        
        /* // Not useful since retailer and buyer are two entities to whom this modifier appliers (buy from farmer vs. buy from retailer)
        address payable buyerAddressPayable = _make_payable(tofus[_upc].buyer);
        buyerAddressPayable.transfer(amountToRefund);
        */
        address payable senderAddressPayable = _make_payable(msg.sender);
        senderAddressPayable.transfer(amountToRefund);
        
    }

    // Function that allows you to convert an address into a payable address
    function _make_payable(address x) internal pure returns (address payable) {
        return payable(x); // According to k06a's answer: https://ethereum.stackexchange.com/a/65694
    }

    // Access Control function
    function addRole(string memory _role, address _newMember) public {
        if (keccak256(bytes(_role)) == keccak256("FARMER")) {
            grantRole(FARMER_ROLE, _newMember);
        } 
        if (keccak256(bytes(_role)) == keccak256("TOFUPRODUCER")) {
            grantRole(TOFUPRODUCER_ROLE, _newMember);
        } 
        if (keccak256(bytes(_role)) == keccak256("DISTRIBUTOR")) {
            grantRole(DISTRIBUTOR_ROLE, _newMember);
        } 
        if (keccak256(bytes(_role)) == keccak256("RETAILER")) {
            grantRole(RETAILER_ROLE, _newMember);
        } 
        if (keccak256(bytes(_role)) == keccak256("CUSTOMER")) {
            grantRole(CUSTOMER_ROLE, _newMember);
        } 
    }

    function removeRole(string memory _role, address _oldMember) public {
        if (keccak256(bytes(_role)) == keccak256("FARMER")) {
            revokeRole(FARMER_ROLE, _oldMember);
        } 
        if (keccak256(bytes(_role)) == keccak256("TOFUPRODUCER")) {
            revokeRole(TOFUPRODUCER_ROLE, _oldMember);
        } 
        if (keccak256(bytes(_role)) == keccak256("DISTRIBUTOR")) {
            revokeRole(DISTRIBUTOR_ROLE, _oldMember);
        } 
        if (keccak256(bytes(_role)) == keccak256("RETAILER")) {
            revokeRole(RETAILER_ROLE, _oldMember);
        } 
        if (keccak256(bytes(_role)) == keccak256("CUSTOMER")) {
            revokeRole(CUSTOMER_ROLE, _oldMember);
        } 
    }

    function isRole(string memory _role, address _member) public view returns (bool bHasRole) {
        if (keccak256(bytes(_role)) == keccak256("FARMER")) {
            bHasRole = hasRole(FARMER_ROLE, _member);
        } 
        if (keccak256(bytes(_role)) == keccak256("TOFUPRODUCER")) {
            bHasRole = hasRole(TOFUPRODUCER_ROLE, _member);
        } 
        if (keccak256(bytes(_role)) == keccak256("DISTRIBUTOR")) {
            bHasRole = hasRole(DISTRIBUTOR_ROLE, _member);
        } 
        if (keccak256(bytes(_role)) == keccak256("RETAILER")) {
            bHasRole = hasRole(RETAILER_ROLE, _member);
        } 
        if (keccak256(bytes(_role)) == keccak256("CUSTOMER")) {
            bHasRole = hasRole(CUSTOMER_ROLE, _member);
        } 
    }


    function plantSoy(
            string memory _name,
            uint _upc,
            uint _price,
            string memory _lat,
            string memory _long) public 
            onlyRole(FARMER_ROLE) {
        // Increment sku
        skuCountSoy = skuCountSoy + 1;

        // Add the new soy into inventory and mark it as planted
        soys[_upc] = Soy(
            {
                name: _name, 
                upc: _upc,
                sku: skuCountSoy, 
                price: _price, 
                state: soyState.Planted, 
                farmer: msg.sender, 
                originLatitude: _lat,
                originLongitude: _long,
                distributor: address(0),
                buyer: address(0), 
                toTofuUpc: 0
            });
    }

    // When checking the soy, the farmer finds out that the soy is ripe (because of their experience, farmers don't check their soy prematurely)
    function checkSoy(uint _upc) public 
        verifyCaller(soys[_upc].farmer) {
        
        soys[_upc].state = soyState.Ripe;
    }

    // The farmers have to harvest their soy
    function harvestSoy(uint _upc) public 
        verifyCaller(soys[_upc].farmer) {
        // Emit event to notify potential buyers
        emit Harvested(_upc);

        soys[_upc].state = soyState.Harvested;
    }

    // orderSoy allows to order one unit of soy from the farmer
    function orderSoy(uint _upc) public payable
        // Call modifier to check if upc is for sale
        checkSoyState(_upc, soyState.Harvested)
        // Call modifier to check if buyer has paid enough
        paidEnough(soys[_upc].price)
        // Call modifier to verify that sender is a tofu producer
        onlyRole(TOFUPRODUCER_ROLE)
        // Call modifier to send any excess ether back to buyer
        checkSoyValue(_upc) {

        address buyer = msg.sender;
        uint  price = soys[_upc].price;
        // Update buyer
        soys[_upc].buyer = buyer;
        // Update state
        soys[_upc].state = soyState.Ordered;
        // Transfer money to farmer
        address payable farmerAddressPayable = _make_payable(soys[_upc].farmer);
        farmerAddressPayable.transfer(price);
        // emit the appropriate event
        emit Sold(_upc);
    }

    // The farmer has to ship the soy
    function shipSoy(uint _upc) public 
        checkSoyState(_upc, soyState.Ordered) 
        verifyCaller(soys[_upc].farmer) {

        soys[_upc].state = soyState.ReadyForShipping;

        emit ReadyForShipping(_upc);
    }

    function fetchSoy(uint _upc) public
        onlyRole(DISTRIBUTOR_ROLE)
        checkSoyState(_upc, soyState.ReadyForShipping) {

        soys[_upc].distributor = msg.sender;
        soys[_upc].state = soyState.Shipping;
    }

    function deliverSoy(uint _upc) public 
        checkSoyState(_upc, soyState.Shipping)
        verifyCaller(soys[_upc].distributor) {

        soys[_upc].state = soyState.Delivered;

        emit Delivered(_upc);
        
    }

    // The tofu company calls makeTofu whenever they produce a unit of tofu from soy
    function makeTofu(
            string memory _name, 
            uint _soyUpc, 
            uint _upc, 
            uint _price,
            string memory _lat,
            string memory _long) public 
            checkSoyState(_soyUpc, soyState.Delivered) 
            verifyCaller(soys[_soyUpc].buyer) {

        // Increment sku for tofu
        skuCountTofu = skuCountTofu + 1;

        soys[_soyUpc].state = soyState.Used;
        soys[_soyUpc].toTofuUpc = _upc;

        // Add newly produced tofu and link it to soy it came from
        tofus[_upc] = Tofu(
            {
                name: _name, 
                upc: _upc,
                sku: skuCountTofu, 
                price: _price, 
                state: tofuState.Produced, 
                producer: msg.sender, 
                originLatitude: _lat,
                originLongitude: _long,
                distributor: address(0), 
                retailer: address(0), 
                buyer: address(0), 
                fromSoyUpc: _soyUpc
            });
        // Emit event
        emit Produced(_upc);
    }

    // The retailer can order tofu using orderTofu()
    function orderTofu(uint _upc) public payable 
        checkTofuState(_upc, tofuState.Produced)
        onlyRole(RETAILER_ROLE)
        paidEnough(tofus[_upc].price)  
        checkTofuValue(_upc) {
        
        address retailer = msg.sender;
        uint price = tofus[_upc].price;
        // Update retailer
        tofus[_upc].retailer = retailer;
        // Update state
        tofus[_upc].state = tofuState.Ordered;
        // Transfer money to producer
        address payable producerAddressPayable = _make_payable(tofus[_upc].producer);
        producerAddressPayable.transfer(price);
    }

    // The tofu company has to ship the tofu
    function shipTofu(uint _upc) public 
        checkTofuState(_upc, tofuState.Ordered) 
        verifyCaller(tofus[_upc].producer) {

        tofus[_upc].state = tofuState.ReadyForShipping;

        emit ReadyForShipping(_upc);
    }

    function fetchTofu(uint _upc) public
        checkTofuState(_upc, tofuState.ReadyForShipping)
        {

        tofus[_upc].distributor = msg.sender;
        tofus[_upc].state = tofuState.Shipping;
    }

    function deliverTofu(uint _upc) public 
        checkTofuState(_upc, tofuState.Shipping)
        verifyCaller(tofus[_upc].distributor) {

        tofus[_upc].state = tofuState.Delivered;

        emit Delivered(_upc);
        
    }

    function putTofuOnSale(uint _upc, uint _price) public 
        checkTofuState(_upc, tofuState.Delivered)
        verifyCaller(tofus[_upc].retailer) {

        tofus[_upc].state = tofuState.OnSale;
        tofus[_upc].price = _price;

        emit OnSale(_upc);
    }

    // buyTofu allows to buy one unit of tofu from the retailer
    function buyTofu(uint _upc) public payable
        checkTofuState(_upc, tofuState.OnSale)
        onlyRole(CUSTOMER_ROLE)
        paidEnough(tofus[_upc].price)
        checkTofuValue(_upc) {

        address buyer = msg.sender;
        uint  price = tofus[_upc].price;
        // Update buyer
        tofus[_upc].buyer = buyer;
        // Update state
        tofus[_upc].state = tofuState.Sold;
        // Transfer money to retailer
        address payable retailerAddressPayable = _make_payable(tofus[_upc].retailer);
        retailerAddressPayable.transfer(price);
        // emit the appropriate event
        emit Sold(_upc);
    }

}
