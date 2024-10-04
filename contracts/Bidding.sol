/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RegistrationVerification.sol";

contract Bidding {
    enum BidStatus {
        Open,
        Closed
    }

    struct Bid {
        uint bidId;
        address initiator;
        uint chemicalId;
        uint price;
        BidStatus status;
        address topBidder;
        uint topOffer;
    }

    struct Bidder {
        address bidder;
        uint offerPrice;
    }

    uint public nextChemicalBidId = 1;
    uint public nextLogisticsBidId = 1;

    mapping(uint => Bid) public chemicalBids;
    mapping(uint => Bidder[]) public chemicalBidders;

    mapping(uint => Bid) public logisticsBids;
    mapping(uint => Bidder[]) public logisticsBidders;

    RegistrationVerification public immutable registrationVerification;

    event NewBid(
        uint bidId,
        address initiator,
        uint chemicalId,
        string bidType
    );
    event BidPlaced(
        uint bidId,
        address bidder,
        uint offerPrice,
        string bidType
    );
    event BidClosed(uint bidId, address winner, uint price, string bidType);

    constructor(address _regContract) {
        require(_regContract != address(0), "Invalid Registration contract");
        registrationVerification = RegistrationVerification(_regContract);
    }

    modifier OnlyVerifiedAuthorizedEntities(
        RegistrationVerification.StakeholderType role1,
        RegistrationVerification.StakeholderType role2
    ) {
        (
            ,
            RegistrationVerification.StakeholderType role,
            ,
            bool isVerified
        ) = registrationVerification.stakeholders(msg.sender);
        require(isVerified, "Stakeholder not verified");
        require(
            role == role1 || role == role2,
            "Your role does not allow this"
        );
        _;
    }

    // Check that chemical is registered
    modifier onlyRegisteredApprovedChemical(uint _chemicalId) {
        require(
            registrationVerification.getChemicalById(_chemicalId).chemicalId !=
                0,
            "Chemical not registered"
        );
        require(
            registrationVerification.getChemicalById(_chemicalId).isApproved,
            "Chemical not approved"
        );
        require(
            registrationVerification
                .getChemicalById(_chemicalId)
                .isDeliveredEndUser == false,
            "Chemical already delivered to EndUser"
        );
        _;
    }

    modifier bidIsOpen(uint _bidId, mapping(uint => Bid) storage bids) {
        require(bids[_bidId].status == BidStatus.Open, "Bidding is closed");
        _;
    }
    modifier bidIsClosed(uint _bidId, mapping(uint => Bid) storage bids) {
        require(
            bids[_bidId].status == BidStatus.Closed,
            "Bidding not Closed yet"
        );
        _;
    }

    // Common logic to initiate a bid
    function initiateBid(
        uint _bidId,
        uint _chemicalId,
        uint _price,
        bool isChemical
    ) internal {
        Bid memory newBid = Bid({
            bidId: _bidId,
            initiator: msg.sender,
            chemicalId: _chemicalId,
            price: _price,
            status: BidStatus.Open,
            topBidder: address(0),
            topOffer: 0
        });

        if (isChemical) {
            chemicalBids[_bidId] = newBid;
            nextChemicalBidId++;
        } else {
            logisticsBids[_bidId] = newBid;
            nextLogisticsBidId++;
        }

        emit NewBid(
            _bidId,
            msg.sender,
            _chemicalId,
            isChemical ? "Chemical" : "Logistics"
        );
    }

    // Manufacturer initiates a chemical bid
    function initiateChemicalBid(
        uint _chemicalId,
        uint _minPrice
    )
        external
        OnlyVerifiedAuthorizedEntities(
            RegistrationVerification.StakeholderType.Manufacturer,
            RegistrationVerification.StakeholderType.Manufacturer
        )
        onlyRegisteredApprovedChemical(_chemicalId)
    {
        initiateBid(nextChemicalBidId, _chemicalId, _minPrice, true);
    }

    // Initiate a logistics bid
    function initiateLogisticsBid(
        uint _chemicalBidId,
        uint _maxPrice
    ) external bidIsClosed(_chemicalBidId, chemicalBids) {
        Bid storage chemicalBid = chemicalBids[_chemicalBidId];
        require(
            msg.sender == chemicalBid.initiator ||
                msg.sender == chemicalBid.topBidder,
            "You are not invloved in this deal"
        );

        initiateBid(
            nextLogisticsBidId,
            chemicalBid.chemicalId,
            _maxPrice,
            false
        );
    }

    function placeBid(
        uint _bidId,
        uint _offerPrice,
        bool isChemical
    )
        external
        OnlyVerifiedAuthorizedEntities(
            isChemical
                ? RegistrationVerification.StakeholderType.Supplier
                : RegistrationVerification.StakeholderType.Logistics,
            isChemical
                ? RegistrationVerification.StakeholderType.EndUser
                : RegistrationVerification.StakeholderType.Logistics
        )
        bidIsOpen(_bidId, isChemical ? chemicalBids : logisticsBids)
    {
        Bid storage bid = isChemical
            ? chemicalBids[_bidId]
            : logisticsBids[_bidId];
        require(
            isChemical ? _offerPrice > bid.price : _offerPrice < bid.price,
            isChemical ? "Offer price too low" : "Offer price too high"
        );

        mapping(uint => Bidder[]) storage bidders = isChemical
            ? chemicalBidders
            : logisticsBidders;
        bidders[_bidId].push(
            Bidder({bidder: msg.sender, offerPrice: _offerPrice})
        );

        emit BidPlaced(
            _bidId,
            msg.sender,
            _offerPrice,
            isChemical ? "Chemical" : "Logistics"
        );
    }

    function closeBid(uint _bidId, bool isChemical) external {
        mapping(uint => Bid) storage bids = isChemical
            ? chemicalBids
            : logisticsBids;
        Bid storage bid = bids[_bidId];
        require(bid.status == BidStatus.Open, "Bidding is already Closed");
        require(msg.sender == bid.initiator, "You did not initiate the bid");

        mapping(uint => Bidder[]) storage bidders = isChemical
            ? chemicalBidders
            : logisticsBidders;
        (address bestBidder, uint bestOffer) = _getBestBidder(
            bidders[_bidId],
            isChemical
        );

        bid.topBidder = bestBidder;
        bid.topOffer = bestOffer;
        bid.status = BidStatus.Closed;

        emit BidClosed(
            _bidId,
            bestBidder,
            bestOffer,
            isChemical ? "Chemical" : "Logistics"
        );
    }

    function _getBestBidder(
        Bidder[] storage bidders,
        bool isHighest
    ) internal view returns (address, uint) {
        uint bestOffer = isHighest ? 0 : type(uint).max;
        address bestBidder;

        if (isHighest) {
            for (uint i = 0; i < bidders.length; i++) {
                if (bidders[i].offerPrice > bestOffer) {
                    bestOffer = bidders[i].offerPrice;
                    bestBidder = bidders[i].bidder;
                }
            }
        } else {
            for (uint i = 0; i < bidders.length; i++) {
                if (bidders[i].offerPrice < bestOffer) {
                    bestOffer = bidders[i].offerPrice;
                    bestBidder = bidders[i].bidder;
                }
            }
        }
        return (bestBidder, bestOffer);
    }

    // Utility function to get details of a specific bid
    function getBidDetails(
        uint _bidId,
        bool isChemical
    )
        public
        view
        returns (
            address initiator,
            uint chemicalId,
            uint price,
            BidStatus status,
            address topBidder,
            uint topOffer
        )
    {
        Bid memory bid = isChemical
            ? chemicalBids[_bidId]
            : logisticsBids[_bidId];
        return (
            bid.initiator,
            bid.chemicalId,
            bid.price,
            bid.status,
            bid.topBidder,
            bid.topOffer
        );
    }

    // Get all bidders details
    function getAllBidderDetails(
        uint _bidId,
        bool isChemical
    ) external view returns (Bidder[] memory) {
        mapping(uint => Bidder[]) storage bids = isChemical
            ? chemicalBidders
            : logisticsBidders;
        Bidder[] memory bidderArray = new Bidder[](bids[_bidId].length);

        for (uint i = 0; i < bids[_bidId].length; i++) {
            bidderArray[i] = bids[_bidId][i];
        }

        return bidderArray;
    }
}
