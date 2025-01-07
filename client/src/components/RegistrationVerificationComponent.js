// src/RegistrationVerificationComponent.js
import React, { useState, useEffect } from 'react';
import web3 from '../utils/web3.js';
import { registrationVerification } from '../contracts.js';

function RegistrationVerificationComponent() {
    const [account, setAccount] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('0');
    const [stakeholders, setStakeholders] = useState([]);
    const [chemicals, setChemicals] = useState([]);
    const [chemicalName, setChemicalName] = useState('');
    const [chemicalId, setChemicalId] = useState('');
    const [isRegulatoryAuthority, setIsRegulatoryAuthority] = useState(false);

    useEffect(() => {
        async function load() {
            if (!web3) {
                alert('Web3 is not initialized. Please install MetaMask.');
                return;
            }

            try {
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                // Check if the user is the regulatory authority
                const regulatoryAuthority = await registrationVerification.methods
                    .regulatoryAuthority()
                    .call();
                setIsRegulatoryAuthority(
                    regulatoryAuthority.toLowerCase() === accounts[0].toLowerCase()
                );

                // Load stakeholders
                const stakeholderAddresses = await registrationVerification.methods
                    .getAllStakeholders()
                    .call();
                const stakeholderPromises = stakeholderAddresses.map((address) =>
                    registrationVerification.methods.stakeholders(address).call()
                );
                const stakeholdersData = await Promise.all(stakeholderPromises);
                setStakeholders(stakeholdersData);

                // Load chemicals
                const chemicalCount = await registrationVerification.methods
                    .getChemicalCount()
                    .call();
                const chemicalsData = [];
                for (let id = 1; id <= chemicalCount; id++) {
                    try {
                        const chemical = await registrationVerification.methods
                            .chemicals(id)
                            .call();
                        if (chemical.chemicalId !== '0') {
                            chemicalsData.push(chemical);
                        }
                    } catch (error) {
                        // Chemical ID does not exist
                    }
                }
                setChemicals(chemicalsData);
            } catch (error) {
                console.error('Error loading data:', error);
                alert('An error occurred while loading data. Please check the console for details.');
            }
        }
        load();
    }, []);

    const handleRegisterStakeholder = async (e) => {
        e.preventDefault();
        try {
            await registrationVerification.methods
                .registerStakeholder(name, role)
                .send({ from: account });
            alert('Stakeholder registered successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error registering stakeholder:', error);
            alert('An error occurred during registration. Please check the console for details.');
        }
    };

    const handleVerifyStakeholder = async (address) => {
        try {
            await registrationVerification.methods
                .verifyStakeholder(address)
                .send({ from: account });
            alert('Stakeholder verified successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error verifying stakeholder:', error);
            alert('An error occurred during verification. Please check the console for details.');
        }
    };

    const handleRegisterChemical = async (e) => {
        e.preventDefault();
        try {
            await registrationVerification.methods
                .registerChemical(chemicalName)
                .send({ from: account });
            alert('Chemical registered successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error registering chemical:', error);
            alert('An error occurred during chemical registration. Please check the console for details.');
        }
    };

    const handleApproveChemical = async (e) => {
        e.preventDefault();
        try {
            await registrationVerification.methods
                .approveChemical(chemicalId)
                .send({ from: account });
            alert('Chemical approved successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error approving chemical:', error);
            alert('An error occurred during chemical approval. Please check the console for details.');
        }
    };

    return (
        <div>
            <h2>Registration and Verification</h2>
            <p>Your Account: {account}</p>

            <h3>Register as Stakeholder</h3>
            <form onSubmit={handleRegisterStakeholder}>
                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="0">Manufacturer</option>
                    <option value="1">Supplier</option>
                    <option value="2">Logistics</option>
                    <option value="3">EndUser</option>
                    <option value="4">Insurance</option>
                </select>
                <button type="submit">Register</button>
            </form>

            <h3>Register Chemical (Manufacturers Only)</h3>
            <form onSubmit={handleRegisterChemical}>
                <input
                    type="text"
                    placeholder="Chemical Name"
                    value={chemicalName}
                    onChange={(e) => setChemicalName(e.target.value)}
                    required
                />
                <button type="submit">Register Chemical</button>
            </form>

            {isRegulatoryAuthority && (
                <>
                    <h3>Approve Chemicals</h3>
                    <form onSubmit={handleApproveChemical}>
                        <input
                            type="number"
                            placeholder="Chemical ID"
                            value={chemicalId}
                            onChange={(e) => setChemicalId(e.target.value)}
                            required
                        />
                        <button type="submit">Approve Chemical</button>
                    </form>

                    <h3>Verify Stakeholders</h3>
                    {stakeholders.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Address</th>
                                    <th>Verified</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stakeholders.map((s, index) => (
                                    <tr key={index}>
                                        <td>{s.name}</td>
                                        <td>
                                            {['Manufacturer', 'Supplier', 'Logistics', 'EndUser', 'Insurance'][s.role]}
                                        </td>
                                        <td>{s.stakeholderAddress}</td>
                                        <td>{s.isVerified ? 'Yes' : 'No'}</td>
                                        <td>
                                            {!s.isVerified && (
                                                <button onClick={() => handleVerifyStakeholder(s.stakeholderAddress)}>
                                                    Verify
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No stakeholders to verify.</p>
                    )}
                </>
            )}

            <h3>Registered Chemicals</h3>
            {chemicals.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Chemical ID</th>
                            <th>Name</th>
                            <th>Approved</th>
                            <th>Delivered</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chemicals.map((c, index) => (
                            <tr key={index}>
                                <td>{c.chemicalId.toString()}</td>
                                <td>{c.chemicalName}</td>
                                <td>{c.isApproved ? 'Yes' : 'No'}</td>
                                <td>{c.isDeliveredEndUser ? 'Yes' : 'No'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No chemicals registered.</p>
            )}
        </div>
    );
}

export default RegistrationVerificationComponent;
