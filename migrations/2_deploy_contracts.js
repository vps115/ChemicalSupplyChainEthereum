const RegistrationVerification = artifacts.require("RegistrationVerification");
const Bidding = artifacts.require("Bidding");
const SupplyLogistics = artifacts.require("SupplyLogistics");
const Insurance = artifacts.require("Insurance");

module.exports = async function (deployer) {

    await deployer.deploy(RegistrationVerification);
    const registrationVerificationInstance = await
        RegistrationVerification.deployed();

    await deployer.deploy(Bidding, registrationVerificationInstance.address);
    const biddingInstance = await
        Bidding.deployed();

    await deployer.deploy(SupplyLogistics, registrationVerificationInstance.address, biddingInstance.address);
    const SupplyLogisticsInstance = await
        RegistrationVerification.deployed();


    await deployer.deploy(Insurance, registrationVerificationInstance.address, SupplyLogisticsInstance.address);
};
