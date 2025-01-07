const RegistrationVerification = artifacts.require("RegistrationVerification");

contract("RegistrationVerification", (accounts) => {
    const [regulatoryAuthority, manufacturer, supplier, logistics, endUser] = accounts;

    let instance;

    beforeEach(async () => {
        instance = await RegistrationVerification.deployed();
    });

    it("should deploy and set regulatory authority", async () => {
        const authority = await instance.regulatoryAuthority();
        assert.equal(authority, regulatoryAuthority, "Regulatory authority is incorrect");
    });

    it("should register a new stakeholder", async () => {
        await instance.registerStakeholder("Manufacturer1", 0, { from: manufacturer });
        const stakeholder = await instance.stakeholders(manufacturer);
        assert.equal(stakeholder.name, "Manufacturer1", "Stakeholder name is incorrect");
        assert.equal(stakeholder.role.toNumber(), 0, "Stakeholder role is incorrect");
        instance.registerStakeholder("supplier1", 1, { from: supplier });
        instance.registerStakeholder("logistics1", 2, { from: logistics });
        instance.registerStakeholder("endUser1", 3, { from: endUser });
    });

    it("should not allow duplicate stakeholder registration", async () => {
        try {
            await instance.registerStakeholder("DuplicateManufacturer", 0, { from: manufacturer });
            assert.fail("Duplicate registration should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Already registered", "Expected error for duplicate registration");
        }
    });

    it("should verify a registered stakeholder by regulatory authority", async () => {
        await instance.verifyStakeholder(manufacturer, { from: regulatoryAuthority });
        const isVerified = await instance.isVerified(manufacturer);
        assert.equal(isVerified, true, "Stakeholder verification failed");
    });

    it("should not allow non-authority to verify a stakeholder", async () => {
        try {
            await instance.verifyStakeholder(supplier, { from: supplier });
            assert.fail("Non-authority verification should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Unauthorized", "Expected error for unauthorized verification");
        }
    });

    it("should register a chemical by a verified manufacturer", async () => {
        await instance.registerChemical("ChemicalX", { from: manufacturer });
        const chemical = await instance.getChemicalById(1);
        assert.equal(chemical.chemicalName, "ChemicalX", "Chemical name is incorrect");
        assert.equal(chemical.registeredBy, manufacturer, "Registered by address is incorrect");
    });

    it("should not allow non-manufacturers to register chemicals", async () => {
        try {
            await instance.registerChemical("ChemicalY", { from: endUser });
            assert.fail("Non-manufacturer chemical registration should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Only manufacturers can register chemicals", "Expected error for non-manufacturer registration");
        }
    });



    it("should approve a chemical registration by regulatory authority", async () => {
        await instance.approveChemical(1, { from: regulatoryAuthority });
        const chemical = await instance.getChemicalById(1);
        assert.equal(chemical.isApproved, true, "Chemical approval failed");
    });

    it("should revoke verification for a stakeholder", async () => {
        await instance.revokeVerification(manufacturer, { from: regulatoryAuthority });
        const isVerified = await instance.isVerified(manufacturer);
        assert.equal(isVerified, false, "Stakeholder verification revocation failed");
    });

    it("should retrieve all registered stakeholders", async () => {
        const stakeholders = await instance.getAllStakeholders();
        assert.equal(stakeholders.length, 4, "Incorrect number of registered stakeholders");
        assert.equal(stakeholders[0], manufacturer, "Registered stakeholder address is incorrect");
    });

    it("should retrieve chemicals registered by manufacturer", async () => {
        const chemicals = await instance.getChemicalsByManufacturer(manufacturer);
        assert.equal(chemicals.length, 1, "Incorrect number of chemicals registered by manufacturer");
        assert.equal(chemicals[0].toNumber(), 1, "Chemical ID is incorrect");
    });
});
