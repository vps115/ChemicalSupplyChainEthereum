// src/InsuranceComponent.js
import React, { useState, useEffect } from 'react';
import web3 from '../utils/web3.js';
import { insurance } from '../contracts.js';

function InsuranceComponent() {
    const [account, setAccount] = useState('');
    const [chemicalId, setChemicalId] = useState('');
    const [coverageAmount, setCoverageAmount] = useState('');
    const [premiumAmount, setPremiumAmount] = useState('');
    const [policyId, setPolicyId] = useState('');
    const [payoutAmount, setPayoutAmount] = useState('');
    const [policies, setPolicies] = useState([]);

    useEffect(() => {
        async function load() {
            try {
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                // Load policies
                const policyCount = await insurance.methods.getPolicyCount().call();
                const policiesData = [];
                for (let id = 1; id <= policyCount; id++) {
                    try {
                        const policy = await insurance.methods.getPolicyDetails(id).call();

                        const {
                            policyId,
                            chemicalId,
                            insuredEntity,
                            coverageAmount,
                            premiumAmount,
                            status,
                        } = policy;

                        policiesData.push({
                            policyId: policyId.toString(),
                            chemicalId: chemicalId.toString(),
                            insuredEntity,
                            coverageAmount: coverageAmount.toString(),
                            premiumAmount: premiumAmount.toString(),
                            status: Number(status.toString()),
                        });
                    } catch (error) {
                        // Policy ID does not exist
                    }
                }
                setPolicies(policiesData);
            } catch (error) {
                console.error('Error loading policies:', error);
                alert('An error occurred while loading policies. Please check the console for details.');
            }
        }
        load();
    }, []);

    const handleCreatePolicy = async (e) => {
        e.preventDefault();
        try {
            await insurance.methods
                .createPolicy(chemicalId, coverageAmount, premiumAmount)
                .send({ from: account });
            alert('Policy created successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error creating policy:', error);
            alert('An error occurred during policy creation. Please check the console for details.');
        }
    };

    const handleActivatePolicy = async (id) => {
        try {
            await insurance.methods.activatePolicy(id).send({ from: account });
            alert('Policy activated successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error activating policy:', error);
            alert('An error occurred while activating the policy. Please check the console for details.');
        }
    };

    const handleInitiateClaim = async (e) => {
        e.preventDefault();
        try {
            await insurance.methods.initiateClaim(policyId, payoutAmount).send({ from: account });
            alert('Claim initiated successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error initiating claim:', error);
            alert('An error occurred during claim initiation. Please check the console for details.');
        }
    };

    const handleSettleClaim = async (id) => {
        try {
            await insurance.methods.settleClaim(id, payoutAmount).send({ from: account });
            alert('Claim settled successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error settling claim:', error);
            alert('An error occurred while settling the claim. Please check the console for details.');
        }
    };

    return (
        <div>
            <h2>Insurance</h2>
            <p>Your Account: {account}</p>

            <h3>Create Insurance Policy</h3>
            <form onSubmit={handleCreatePolicy}>
                <input
                    type="number"
                    placeholder="Chemical ID"
                    value={chemicalId}
                    onChange={(e) => setChemicalId(e.target.value)}
                    required
                />
                <input
                    type="number"
                    placeholder="Coverage Amount"
                    value={coverageAmount}
                    onChange={(e) => setCoverageAmount(e.target.value)}
                    required
                />
                <input
                    type="number"
                    placeholder="Premium Amount"
                    value={premiumAmount}
                    onChange={(e) => setPremiumAmount(e.target.value)}
                    required
                />
                <button type="submit">Create Policy</button>
            </form>

            <h3>Policies</h3>
            {policies.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Policy ID</th>
                            <th>Chemical ID</th>
                            <th>Insured Entity</th>
                            <th>Coverage</th>
                            <th>Premium</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {policies.map((p, index) => (
                            <tr key={index}>
                                <td>{p.policyId}</td>
                                <td>{p.chemicalId}</td>
                                <td>{p.insuredEntity}</td>
                                <td>{p.coverageAmount}</td>
                                <td>{p.premiumAmount}</td>
                                <td>{['Created', 'Active', 'Claimed', 'Settled'][p.status]}</td>
                                <td>
                                    {p.status === 0 && (
                                        <button onClick={() => handleActivatePolicy(p.policyId)}>Activate</button>
                                    )}
                                    {p.status === 1 && (
                                        <form onSubmit={handleInitiateClaim}>
                                            <input
                                                type="number"
                                                placeholder="Policy ID"
                                                value={policyId}
                                                onChange={(e) => setPolicyId(e.target.value)}
                                                required
                                            />
                                            <input
                                                type="number"
                                                placeholder="Claim Amount"
                                                value={payoutAmount}
                                                onChange={(e) => setPayoutAmount(e.target.value)}
                                                required
                                            />
                                            <button type="submit">Initiate Claim</button>
                                        </form>
                                    )}
                                    {p.status === 2 && (
                                        <button onClick={() => handleSettleClaim(p.policyId)}>Settle Claim</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No policies available.</p>
            )}
        </div>
    );
}

export default InsuranceComponent;
