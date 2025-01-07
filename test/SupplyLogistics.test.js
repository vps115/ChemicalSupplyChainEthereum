const SupplyLogistics = artifacts.require("SupplyLogistics");
const RegistrationVerification = artifacts.require("RegistrationVerification");
const Bidding = artifacts.require("Bidding");

contract("SupplyLogistics", (accounts) => {
    let supplyLogisticsInstance;
    let registrationVerificationInstance;
    let biddingInstance;

    const regulatoryAuthority = accounts[0];
    const manufacturer = accounts[1];
    const supplier = accounts[2];
    const endUser = accounts[3];
    const logisticsProvider = accounts[4];

    before(async () => {
        // Deploy RegistrationVerification and Bidding contracts
        registrationVerificationInstance = await RegistrationVerification.new();
        biddingInstance = await Bidding.new(registrationVerificationInstance.address);

        // Deploy SupplyLogistics contract
        supplyLogisticsInstance = await SupplyLogistics.new(registrationVerificationInstance.address, biddingInstance.address);

        // Register stakeholders
        await registrationVerificationInstance.registerStakeholder("Manufacturer", 0, { from: manufacturer });
        await registrationVerificationInstance.registerStakeholder("Supplier", 1, { from: supplier });
        await registrationVerificationInstance.registerStakeholder("Logistics", 2, { from: logisticsProvider });
        await registrationVerificationInstance.registerStakeholder("EndUser", 3, { from: endUser });

        // Verify stakeholders
        await registrationVerificationInstance.verifyStakeholder(manufacturer, { from: regulatoryAuthority });
        await registrationVerificationInstance.verifyStakeholder(supplier, { from: regulatoryAuthority });
        await registrationVerificationInstance.verifyStakeholder(logisticsProvider, { from: regulatoryAuthority });
        await registrationVerificationInstance.verifyStakeholder(endUser, { from: regulatoryAuthority });

        // Register a chemical
        await registrationVerificationInstance.registerChemical("Chemical A");
        await registrationVerificationInstance.approveChemical(1, { from: regulatoryAuthority });
    });

    it("should create a shipment after closing a chemical and logistics bid", async () => {
        // Manufacturer initiates a chemical bid
        await biddingInstance.initiateChemicalBid(1, 100, { from: manufacturer });

        // Supplier places a bid on the chemical
        await biddingInstance.placeBid(1, 150, true, { from: supplier });

        // Manufacturer closes the chemical bid
        await biddingInstance.closeBid(1, true, { from: manufacturer });

        // Supplier initiates a logistics bid
        await biddingInstance.initiateLogisticsBid(1, 1000, { from: supplier });

        // Logistics provider places a bid on the logistics
        await biddingInstance.placeBid(1, 900, false, { from: logisticsProvider });

        // Supplier closes the logistics bid
        await biddingInstance.closeBid(1, false, { from: supplier });

        // Supplier creates the shipment
        await supplyLogisticsInstance.createShipment(1, 1, { from: supplier });

        // Retrieve the shipment details
        const shipment = await supplyLogisticsInstance.shipments(0);

        assert.equal(shipment.chemicalId, 1, "Chemical ID should match");
        assert.equal(shipment.fromEntity, manufacturer, "Shipment fromEntity should match manufacturer");
        assert.equal(shipment.toEntity, supplier, "Shipment toEntity should match supplier");
        assert.equal(shipment.logisticsProvider, logisticsProvider, "Logistics provider should match");
        assert.equal(shipment.status.toString(), "0", "Shipment should be in 'Created' state");
    });

    it("should dispatch a shipment by fromEntity", async () => {
        // Manufacturer dispatches the shipment
        await supplyLogisticsInstance.dispatchShipment(0, { from: manufacturer });

        const shipment = await supplyLogisticsInstance.shipments(0);
        assert.equal(shipment.status.toString(), "1", "Shipment should be in 'Dispatched' state");
    });

    it("should mark a shipment as in transit by logistics provider", async () => {
        // Logistics provider marks the shipment as InTransit
        await supplyLogisticsInstance.markInTransit(0, { from: logisticsProvider });

        const shipment = await supplyLogisticsInstance.shipments(0);
        assert.equal(shipment.status.toString(), "2", "Shipment should be in 'InTransit' state");
    });

    it("should mark a shipment as delivered by toEntity", async () => {
        // Supplier (toEntity) marks the shipment as Delivered
        await supplyLogisticsInstance.markDelivered(0, { from: supplier });

        const shipment = await supplyLogisticsInstance.shipments(0);
        const chemical = await registrationVerificationInstance.getChemicalById(shipment.chemicalId)
        assert.equal(shipment.status.toString(), "3", "Shipment should be in 'Delivered' state");
    });

    it("should fail a shipment", async () => {
        // Simulate a failed shipment (only possible before delivery)
        await supplyLogisticsInstance.createShipment(1, 1, { from: supplier });
        await supplyLogisticsInstance.dispatchShipment(1, { from: manufacturer });
        await supplyLogisticsInstance.markInTransit(1, { from: logisticsProvider });

        await supplyLogisticsInstance.markFailed(1, { from: manufacturer });

        const shipment = await supplyLogisticsInstance.shipments(1);
        assert.equal(shipment.status.toString(), "4", "Shipment should be in 'Failed' state");
    });

    it("should not allow an unverified user to create a shipment", async () => {
        try {
            await supplyLogisticsInstance.createShipment(1, 1, { from: accounts[5] });
            assert.fail("Non-verified stakeholders should not be allowed to create shipement")
        } catch (error) {
            assert.include(error.message, "Stakeholder not verified", "Expected revert error")
        }

    });

    it("should not allow a non-involved entity to update the shipment status", async () => {
        try {
            await supplyLogisticsInstance.markFailed(0, { from: endUser });
            assert.fail("Non-involved entity should not be able to update status");
        } catch (error) {
            assert.include(error.message, "Not authorized for this shipment", "Expected revert error");
        }
    });

    it("should not allow invalid state transitions", async () => {
        // Shipment ID 0 is already in transit
        try {
            // Attempt to mark as Delivered without transitioning from InTransit
            await supplyLogisticsInstance.markDelivered(1, { from: supplier });
            assert.fail("Should not allow to mark as Delivered without being InTransit");
        } catch (error) {
            assert.include(error.message, "Shipment is not in transit", "Expected revert error");
        }

        try {
            // Attempt to dispatch an already dispatched shipment
            await supplyLogisticsInstance.dispatchShipment(0, { from: manufacturer });
            assert.fail("Shipment should not be dispatched again after already being dispatched");
        } catch (error) {
            assert.include(error.message, "Shipment is not in a state to be dispatched", "Expected revert error");
        }
    });
});
