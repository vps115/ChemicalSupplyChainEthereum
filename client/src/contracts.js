// src/contracts.js
import web3 from './utils/web3';

// Import the ABI JSON files
import RegistrationVerificationJSON from './abis/RegistrationVerification.json';
import BiddingJSON from './abis/Bidding.json';
import SupplyLogisticsJSON from './abis/SupplyLogistics.json';
import InsuranceJSON from './abis/Insurance.json';

// Replace with your deployed contract addresses
const registrationVerificationAddress = '0xFc2cb2f674C9183Cfa210Bde80f28dA199672078';
const biddingAddress = '0xf16B2456Cb6608741C762C7dA4cfB0039ac54223';
const supplyLogisticsAddress = '0xfeb4DEeB6A5c319BA827E61506f3741e1A54f1F5';
const insuranceAddress = '0x10e012e96237079010e3e618997B8Ed178774e2C';

// Create contract instances using the .abi property
const registrationVerification = new web3.eth.Contract(
    RegistrationVerificationJSON.abi, // Access the 'abi' property
    registrationVerificationAddress
);

const bidding = new web3.eth.Contract(
    BiddingJSON.abi, // Access the 'abi' property
    biddingAddress
);

const supplyLogistics = new web3.eth.Contract(
    SupplyLogisticsJSON.abi, // Access the 'abi' property
    supplyLogisticsAddress
);

const insurance = new web3.eth.Contract(
    InsuranceJSON.abi, // Access the 'abi' property
    insuranceAddress
);

// Export the contract instances
export {
    registrationVerification,
    bidding,
    supplyLogistics,
    insurance
};
