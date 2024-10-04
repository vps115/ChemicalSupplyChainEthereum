// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RegistrationVerification {
    enum StakeholderType {
        Manufacturer,
        Supplier,
        Logistics,
        EndUser,
        Insurance
    }

    struct Stakeholder {
        string name;
        StakeholderType role;
        address stakeholderAddress;
        bool isVerified;
    }

    struct Chemical {
        string chemicalName;
        uint chemicalId;
        address registeredBy;
        bool isApproved;
        bool isDeliveredEndUser;
    }

    address public regulatoryAuthority;
    uint private nextChemicalId = 1;

    mapping(address => Stakeholder) public stakeholders;
    mapping(uint => Chemical) public chemicals;
    mapping(address => uint[]) public chemicalsRegisteredBy;
    address[] private registeredStakeholders;

    event StakeholderRegistered(
        address stakeholder,
        string name,
        StakeholderType role
    );
    event StakeholderVerified(address stakeholder, string name);
    event StakeholderVerificationRevoked(address stakeholder, string name);
    event ChemicalRegistered(
        uint chemicalId,
        string chemicalName,
        address registeredBy
    );
    event ChemicalApproved(uint chemicalId, string chemicalName);

    modifier onlyRegulatoryAuthority() {
        require(msg.sender == regulatoryAuthority, "Unauthorized");
        _;
    }

    modifier onlyManufacturer() {
        require(
            stakeholders[msg.sender].role == StakeholderType.Manufacturer,
            "Only manufacturers can register chemicals"
        );
        _;
    }

    constructor() {
        regulatoryAuthority = msg.sender;
    }

    // Register new stakeholder
    function registerStakeholder(
        string calldata _name,
        StakeholderType _role
    ) external {
        require(
            stakeholders[msg.sender].stakeholderAddress == address(0),
            "Already registered"
        );

        stakeholders[msg.sender] = Stakeholder({
            name: _name,
            role: _role,
            stakeholderAddress: msg.sender,
            isVerified: false
        });

        registeredStakeholders.push(msg.sender);
        emit StakeholderRegistered(msg.sender, _name, _role);
    }

    // Verify a stakeholder (only regulatory authority)
    function verifyStakeholder(
        address _stakeholder
    ) external onlyRegulatoryAuthority {
        Stakeholder storage stakeholder = stakeholders[_stakeholder];
        require(
            stakeholder.stakeholderAddress != address(0),
            "Stakeholder not registered"
        );

        stakeholder.isVerified = true;
        emit StakeholderVerified(_stakeholder, stakeholder.name);
    }

    // Register a chemical (only manufacturers can register)
    function registerChemical(
        string calldata _chemicalName
    ) external onlyManufacturer {
        uint chemicalId = nextChemicalId++;

        chemicals[chemicalId] = Chemical({
            chemicalName: _chemicalName,
            chemicalId: chemicalId,
            registeredBy: msg.sender,
            isApproved: false,
            isDeliveredEndUser: false
        });

        chemicalsRegisteredBy[msg.sender].push(chemicalId);
        emit ChemicalRegistered(chemicalId, _chemicalName, msg.sender);
    }

    // Approve chemical registration (only regulatory authority)
    function approveChemical(
        uint _chemicalId
    ) external onlyRegulatoryAuthority {
        Chemical storage chemical = chemicals[_chemicalId];
        require(chemical.chemicalId != 0, "Chemical not registered");

        chemical.isApproved = true;
        emit ChemicalApproved(_chemicalId, chemical.chemicalName);
    }

    // Revoke verification (only regulatory authority)
    function revokeVerification(
        address _stakeholder
    ) external onlyRegulatoryAuthority {
        Stakeholder storage stakeholder = stakeholders[_stakeholder];
        require(
            stakeholder.stakeholderAddress != address(0),
            "Stakeholder not registered"
        );

        stakeholder.isVerified = false;
        emit StakeholderVerificationRevoked(_stakeholder, stakeholder.name);
    }

    // Check if a stakeholder is verified
    function isVerified(address _stakeholder) external view returns (bool) {
        return stakeholders[_stakeholder].isVerified;
    }

    // Function to mark a chemical as delivered
    function markChemicalDelivered(uint _chemicalId) external {
        // Find the chemical by its ID and update isDeliveredEndUser
        require(_chemicalId != 0, "Chemical not registered");
        require(chemicals[_chemicalId].isApproved, "Chemical not approved");
        require(
            stakeholders[msg.sender].isVerified,
            "Stakeholder not verified"
        );

        chemicals[_chemicalId].isDeliveredEndUser = true;
    }

    // Get all registered stakeholders
    function getAllStakeholders() external view returns (address[] memory) {
        return registeredStakeholders;
    }

    // Get chemical details by ID
    function getChemicalById(
        uint _chemicalId
    ) external view returns (Chemical memory) {
        return chemicals[_chemicalId];
    }

    // Get all chemicals registered by a manufacturer
    function getChemicalsByManufacturer(
        address _manufacturer
    ) external view returns (uint[] memory) {
        return chemicalsRegisteredBy[_manufacturer];
    }
}
