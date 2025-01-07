const Bidding = artifacts.require("Bidding");
const RegistrationVerification = artifacts.require("RegistrationVerification");

contract("Bidding", (accounts) => {
    let biddingInstance;
    let registrationVerificationInstance;

    const regulatoryAuthority = accounts[0];
    const manufacturer = accounts[1];
    const supplier = accounts[2];
    const endUser = accounts[3];
    const logisticsProvider = accounts[4];
    const nonStakeholder = accounts[5];

    before(async () => {
        // Deploy the RegistrationVerification contract first
        registrationVerificationInstance = await RegistrationVerification.new();
        biddingInstance = await Bidding.new(registrationVerificationInstance.address);

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

    describe("Chemical Bidding Flow", () => {
        it("should allow a manufacturer to initiate a chemical bid", async () => {
            const minPrice = web3.utils.toWei("1", "ether");
            await biddingInstance.initiateChemicalBid(1, minPrice, { from: manufacturer });

            const bid = await biddingInstance.getBidDetails(1, true);
            assert.equal(bid.initiator, manufacturer, "The initiator should be the manufacturer");
            assert.equal(bid.chemicalId, 1, "The chemical ID should match");
            assert.equal(bid.price, minPrice, "The minimum price should match");
            assert.equal(bid.status, 0, "The bid should be open");
        });

        it("should allow a supplier to place a bid on a chemical", async () => {
            const offerPrice = web3.utils.toWei("2", "ether");
            await biddingInstance.placeBid(1, offerPrice, true, { from: supplier });

            // Check if the bid was placed
            const bid = await biddingInstance.getAllBidderDetails(1, true);
            assert.equal(bid[0].offerPrice, offerPrice, "The highest offer should be recorded");
        });

        it("should not allow a non-stakeholder to place a chemical bid", async () => {
            const offerPrice = web3.utils.toWei("20", "ether");
            try {
                await biddingInstance.placeBid(1, offerPrice, true, { from: nonStakeholder });
                assert.fail("Non-stakeholder should not be allowed to place bids");
            } catch (error) {
                assert.include(error.message, "Stakeholder not verified", "Expected revert error");
            }
        });

        it("should allow the manufacturer to close the chemical bid and select the highest bidder", async () => {
            await biddingInstance.closeBid(1, true, { from: manufacturer });

            const bid = await biddingInstance.getBidDetails(1, true);
            assert.equal(bid.status, 1, "The bid should be closed");
            assert.equal(bid.topBidder, supplier, "The highest bidder should be the supplier");
        });
    });

    describe("Logistics Bidding Flow", () => {
        it("should allow the manufacturer to initiate a logistics bid after closing chemical bid", async () => {
            const maxLogisticsPrice = web3.utils.toWei("2", "ether");
            await biddingInstance.initiateLogisticsBid(1, maxLogisticsPrice, { from: manufacturer });

            const logisticsBid = await biddingInstance.getBidDetails(1, false);
            assert.equal(logisticsBid.initiator, manufacturer, "The initiator should be the manufacturer");
            assert.equal(logisticsBid.price, maxLogisticsPrice, "The maximum logistics price should match");
            assert.equal(logisticsBid.status, 0, "The logistics bid should be open");
        });

        it("should allow a logistics provider to place a logistics bid", async () => {
            const offerPrice = web3.utils.toWei("1", "ether");
            await biddingInstance.placeBid(1, offerPrice, false, { from: logisticsProvider });

            const logisticsBid = await biddingInstance.getAllBidderDetails(1, false);
            assert.equal(logisticsBid[0].offerPrice, offerPrice, "The lowest offer should be recorded");
        });

        it("should not allow a non-logistics provider to place a logistics bid", async () => {
            const offerPrice = web3.utils.toWei("4", "ether");
            try {
                await biddingInstance.placeBid(1, offerPrice, false, { from: supplier });
                assert.fail("Only logistics providers should be able to place logistics bids");
            } catch (error) {
                assert.include(error.message, "Your role does not allow this", "Expected revert error");
            }
        });

        it("should allow the manufacturer to close the logistics bid and select the lowest bidder", async () => {
            await biddingInstance.closeBid(1, false, { from: manufacturer });

            const logisticsBid = await biddingInstance.getBidDetails(1, false);
            assert.equal(logisticsBid.status, 1, "The logistics bid should be closed");
            assert.equal(logisticsBid.topBidder, logisticsProvider, "The lowest bidder should be the logistics provider");
        });
    });
});
