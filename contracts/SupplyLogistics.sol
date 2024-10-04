// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RegistrationVerification.sol";
import "./Bidding.sol";

contract SupplyLogistics {
    enum Status {
        Created,
        Dispatched,
        InTransit,
        Delivered,
        Failed
    }

    struct Shipment {
        address fromEntity;
        address toEntity;
        address logisticsProvider;
        uint chemicalId;
        Status status;
        uint timestamp;
        address initiatingEntity;
        uint logisticsOffer;
        uint chemicalBidId;
    }

    uint public shipmentCount;
    mapping(uint => Shipment) public shipments;

    RegistrationVerification public immutable registrationVerification;
    Bidding public immutable biddingContract;

    event ShipmentCreated(
        uint shipmentId,
        address fromEntity,
        address toEntity,
        address logisticsProvider,
        uint chemicalId,
        uint chemicalBidId,
        address initiatingEntity,
        uint logisticsOffer
    );
    event ShipmentStatusUpdated(
        uint shipmentId,
        uint chemicalId,
        Status newStatus,
        uint timestamp
    );

    constructor(address _regContract, address _biddingContract) {
        require(_regContract != address(0), "Invalid Registration contract");
        require(_biddingContract != address(0), "Invalid Bidding contract");
        registrationVerification = RegistrationVerification(_regContract);
        biddingContract = Bidding(_biddingContract);
        shipmentCount = 0;
    }

    // Modifier to ensure only verified stakeholders
    modifier onlyVerifiedStakeholder() {
        require(
            registrationVerification.isVerified(msg.sender),
            "Stakeholder not verified"
        );
        _;
    }

    // Modifier for sender or receiver to take actions
    modifier onlyInvolvedEntities(uint _shipmentId) {
        Shipment storage shipment = shipments[_shipmentId];
        require(
            msg.sender == shipment.fromEntity ||
                msg.sender == shipment.toEntity ||
                msg.sender == shipment.logisticsProvider,
            "Not authorized for this shipment"
        );
        _;
    }

    // Modifier to check if logistics bid is valid
    modifier validLogisticsBid(uint _logisticsBidId) {
        (, , , , Bidding.BidStatus status, , ) = biddingContract.logisticsBids(
            _logisticsBidId
        );

        require(
            status == Bidding.BidStatus.Closed,
            "Logistics bid is not closed"
        );
        _;
    }

    // Initiate a shipment (can be done by Manufacturer, Supplier, or EndUser)
    function createShipment(
        uint _logisticsBidId,
        uint _chemicalBidId
    ) external onlyVerifiedStakeholder validLogisticsBid(_logisticsBidId) {
        (
            ,
            address chemicalInitiator,
            uint chemicalId,
            ,
            ,
            address chemicalHighestBidder,

        ) = biddingContract.chemicalBids(_chemicalBidId);

        (
            ,
            address logisticsInitiator,
            ,
            ,
            ,
            address logisticsLowestBidder,
            uint logisticsLowestOffer
        ) = biddingContract.logisticsBids(_logisticsBidId);

        require(
            msg.sender == logisticsInitiator,
            "Only logistics bid winner can create a shipment"
        );

        shipments[shipmentCount] = Shipment({
            fromEntity: chemicalInitiator,
            toEntity: chemicalHighestBidder,
            logisticsProvider: logisticsLowestBidder,
            chemicalId: chemicalId,
            status: Status.Created,
            timestamp: block.timestamp,
            initiatingEntity: logisticsInitiator,
            logisticsOffer: logisticsLowestOffer,
            chemicalBidId: _chemicalBidId
        });

        emit ShipmentCreated(
            shipmentCount,
            chemicalInitiator,
            chemicalHighestBidder,
            logisticsLowestBidder,
            chemicalId,
            _chemicalBidId,
            logisticsInitiator,
            logisticsLowestOffer
        );

        shipmentCount++;
    }

    // Dispatches the shipment (can only be done by fromEntity)
    function dispatchShipment(
        uint _shipmentId
    ) external onlyInvolvedEntities(_shipmentId) {
        Shipment storage shipment = shipments[_shipmentId];
        require(
            msg.sender == shipment.fromEntity,
            "Only the sender can dispatch the shipment"
        );
        require(
            shipment.status == Status.Created,
            "Shipment is not in a state to be dispatched"
        );

        shipment.status = Status.Dispatched;
        shipment.timestamp = block.timestamp;

        emit ShipmentStatusUpdated(
            _shipmentId,
            shipment.chemicalId,
            Status.Dispatched,
            block.timestamp
        );
    }

    // Logistics provider marks shipment as in transit
    function markInTransit(
        uint _shipmentId
    ) external onlyInvolvedEntities(_shipmentId) {
        Shipment storage shipment = shipments[_shipmentId];
        require(
            msg.sender == shipment.logisticsProvider,
            "Only logistics provider can mark shipment as in transit"
        );
        require(
            shipment.status == Status.Dispatched,
            "Shipment is not dispatched"
        );

        shipment.status = Status.InTransit;
        shipment.timestamp = block.timestamp;

        emit ShipmentStatusUpdated(
            _shipmentId,
            shipment.chemicalId,
            Status.InTransit,
            block.timestamp
        );
    }

    // Receiver (Supplier/EndUser) marks shipment as delivered
    function markDelivered(
        uint _shipmentId
    ) external onlyInvolvedEntities(_shipmentId) {
        Shipment storage shipment = shipments[_shipmentId];
        require(
            msg.sender == shipment.toEntity,
            "Only toEntity can mark shipment as delivered"
        );
        require(
            shipment.status == Status.InTransit,
            "Shipment is not in transit"
        );

        shipment.status = Status.Delivered;
        shipment.timestamp = block.timestamp;

        (
            ,
            RegistrationVerification.StakeholderType role,
            ,

        ) = registrationVerification.stakeholders(shipment.toEntity);
        if (role == RegistrationVerification.StakeholderType.EndUser) {
            registrationVerification.markChemicalDelivered(shipment.chemicalId);
        }

        emit ShipmentStatusUpdated(
            _shipmentId,
            shipment.chemicalId,
            Status.Delivered,
            block.timestamp
        );
    }

    // Any party (sender, receiver, or logistics provider) can mark shipment as failed
    function markFailed(
        uint _shipmentId
    ) external onlyInvolvedEntities(_shipmentId) {
        Shipment storage shipment = shipments[_shipmentId];
        require(
            shipment.status != Status.Delivered,
            "Cannot mark a delivered shipment as failed"
        );

        shipment.status = Status.Failed;
        shipment.timestamp = block.timestamp;

        emit ShipmentStatusUpdated(
            _shipmentId,
            shipment.chemicalId,
            Status.Failed,
            block.timestamp
        );
    }
}
