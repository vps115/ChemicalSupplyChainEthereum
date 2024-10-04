// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RegistrationVerification.sol";
import "./SupplyLogistics.sol";

contract Insurance {
    enum InsuranceStatus {
        Created,
        Active,
        Claimed,
        Settled
    }

    struct InsurancePolicy {
        uint policyId;
        uint chemicalId;
        address insuredEntity;
        uint coverageAmount;
        uint premiumAmount;
        InsuranceStatus status;
    }

    uint public nextPolicyId = 1;
    mapping(uint => InsurancePolicy) public policies;
    mapping(uint => uint[]) public policiesForChemical;
    mapping(address => uint[]) public policiesByEntity;

    RegistrationVerification public immutable registrationVerification;
    SupplyLogistics public immutable supplyLogistics;

    event PolicyCreated(
        uint policyId,
        uint chemicalId,
        address insuredEntity,
        uint coverageAmount,
        uint premiumAmount
    );
    event PolicyActivated(uint policyId);
    event ClaimInitiated(uint policyId, uint claimAmount, address claimedBy);
    event ClaimSettled(uint policyId, uint payoutAmount, address settledBy);

    // Handle only involved entity case in front end
    modifier OnlyVerifiedEntities() {
        require(
            registrationVerification.isVerified(msg.sender),
            "Stakeholder not verified"
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
        _;
    }

    modifier OnlyInsuranceProvider() {
        (
            ,
            RegistrationVerification.StakeholderType role,
            ,
            bool isVerified
        ) = registrationVerification.stakeholders(msg.sender);
        require(isVerified, "Stakeholder not verified");
        require(
            role == RegistrationVerification.StakeholderType.Insurance,
            "Your role does not allow this"
        );
        _;
    }

    modifier OnlyValidPolicy(uint _policyId) {
        require(policies[_policyId].policyId != 0, "Invalid policy ID");
        _;
    }

    modifier OnlyActivePolicy(uint _policyId) {
        require(
            policies[_policyId].status == InsuranceStatus.Active,
            "Policy is not active"
        );
        _;
    }

    constructor(address _regContract, address _logisticsContract) {
        require(_regContract != address(0), "Invalid Registration contract");
        require(
            _logisticsContract != address(0),
            "Invalid Supply Logistics contract"
        );
        registrationVerification = RegistrationVerification(_regContract);
        supplyLogistics = SupplyLogistics(_logisticsContract);
    }

    // Create a new insurance policy for a chemical
    function createPolicy(
        uint _chemicalId,
        uint _coverageAmount,
        uint _premiumAmount
    )
        external
        OnlyVerifiedEntities
        onlyRegisteredApprovedChemical(_chemicalId)
    {
        uint policyId = nextPolicyId++;
        policies[policyId] = InsurancePolicy({
            policyId: policyId,
            chemicalId: _chemicalId,
            insuredEntity: msg.sender,
            coverageAmount: _coverageAmount,
            premiumAmount: _premiumAmount,
            status: InsuranceStatus.Created
        });

        policiesForChemical[_chemicalId].push(policyId);
        policiesByEntity[msg.sender].push(policyId);

        emit PolicyCreated(
            policyId,
            _chemicalId,
            msg.sender,
            _coverageAmount,
            _premiumAmount
        );
    }

    // Activate the policy (could be called by the insurance provider)
    function activatePolicy(
        uint _policyId
    ) external OnlyInsuranceProvider OnlyValidPolicy(_policyId) {
        InsurancePolicy storage policy = policies[_policyId];
        require(
            policy.status == InsuranceStatus.Created,
            "Policy already activated or claimed"
        );

        policy.status = InsuranceStatus.Active;
        emit PolicyActivated(_policyId);
    }

    // Initiate a claim for a policy (insured entity or logistics provider)
    function initiateClaim(
        uint _policyId,
        uint _claimAmount
    ) external OnlyValidPolicy(_policyId) OnlyActivePolicy(_policyId) {
        InsurancePolicy storage policy = policies[_policyId];
        require(
            msg.sender == policy.insuredEntity,
            "Only insured entity can claim"
        );
        require(
            _claimAmount <= policy.coverageAmount,
            "Claim exceeds coverage amount"
        );

        policy.status = InsuranceStatus.Claimed;
        emit ClaimInitiated(_policyId, _claimAmount, msg.sender);
    }

    // Settle the claim (called by the insurance provider)
    function settleClaim(
        uint _policyId,
        uint _payoutAmount
    ) external OnlyInsuranceProvider OnlyValidPolicy(_policyId) {
        InsurancePolicy storage policy = policies[_policyId];
        require(policy.status == InsuranceStatus.Claimed, "No claim initiated");
        require(
            _payoutAmount <= policy.coverageAmount,
            "Payout exceeds coverage amount"
        );

        policy.status = InsuranceStatus.Settled;
        emit ClaimSettled(_policyId, _payoutAmount, msg.sender);
    }

    // View insurance policies for a specific chemical
    function getPoliciesForChemical(
        uint _chemicalId
    ) external view returns (uint[] memory) {
        return policiesForChemical[_chemicalId];
    }

    // View insurance policies created by a specific entity
    function getPoliciesByEntity(
        address _entity
    ) external view returns (uint[] memory) {
        return policiesByEntity[_entity];
    }

    // View details of a specific insurance policy
    function getPolicyDetails(
        uint _policyId
    ) external view returns (InsurancePolicy memory) {
        return policies[_policyId];
    }
}
