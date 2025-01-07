// src/SupplyLogisticsComponent.js
import React, { useState, useEffect } from 'react';
import web3 from '../utils/web3.js';
import { supplyLogistics } from '../contracts.js';

function SupplyLogisticsComponent() {
    const [account, setAccount] = useState('');
    const [logisticsBidId, setLogisticsBidId] = useState('');
    const [chemicalBidId, setChemicalBidId] = useState('');
    const [shipments, setShipments] = useState([]);

    useEffect(() => {
        async function load() {
            try {
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                // Load shipments
                const shipmentCount = await supplyLogistics.methods.getShipmentCount().call();
                const shipmentsData = [];
                for (let id = 0; id < shipmentCount; id++) {
                    try {
                        const shipment = await supplyLogistics.methods.getShipmentDetails(id).call();

                        const {
                            fromEntity,
                            toEntity,
                            logisticsProvider,
                            chemicalId,
                            status,
                            timestamp,
                            initiatingEntity,
                            logisticsOffer,
                            chemicalBidId,
                        } = shipment;

                        // Convert BigInt values to strings or numbers
                        shipmentsData.push({
                            id,
                            fromEntity,
                            toEntity,
                            logisticsProvider,
                            chemicalId: chemicalId.toString(),
                            status: Number(status.toString()),
                            timestamp: Number(timestamp.toString()),
                            initiatingEntity,
                            logisticsOffer: logisticsOffer.toString(),
                            chemicalBidId: chemicalBidId.toString(),
                        });

                    } catch (error) {
                        console.log(error)
                    }
                }
                setShipments(shipmentsData);
            } catch (error) {
                console.error('Error loading shipments:', error);
                alert('An error occurred while loading shipments. Please check the console for details.');
            }
        }
        load();
    }, []);

    const handleCreateShipment = async (e) => {
        e.preventDefault();
        try {
            await supplyLogistics.methods
                .createShipment(logisticsBidId, chemicalBidId)
                .send({ from: account });
            alert('Shipment created successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error creating shipment:', error);
            alert('An error occurred during shipment creation. Please check the console for details.');
        }
    };

    const handleUpdateStatus = async (id, action) => {
        try {
            await supplyLogistics.methods[action](id).send({ from: account });
            alert('Shipment status updated successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error updating shipment status:', error);
            alert('An error occurred while updating shipment status. Please check the console for details.');
        }
    };

    return (
        <div>
            <h2>Supply Logistics</h2>
            <p>Your Account: {account}</p>

            <h3>Create Shipment</h3>
            <form onSubmit={handleCreateShipment}>
                <input
                    type="number"
                    placeholder="Logistics Bid ID"
                    value={logisticsBidId}
                    onChange={(e) => setLogisticsBidId(e.target.value)}
                    required
                />
                <input
                    type="number"
                    placeholder="Chemical Bid ID"
                    value={chemicalBidId}
                    onChange={(e) => setChemicalBidId(e.target.value)}
                    required
                />
                <button type="submit">Create Shipment</button>
            </form>

            <h3>Shipments</h3>
            {shipments.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Shipment ID</th>
                            <th>Chemical ID</th>
                            <th>Status</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Logistics Provider</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shipments.map((s, index) => (
                            <tr key={index}>
                                <td>{s.id}</td>
                                <td>{s.chemicalId}</td>
                                <td>{['Created', 'Dispatched', 'InTransit', 'Delivered', 'Failed'][s.status]}</td>
                                <td>{s.fromEntity}</td>
                                <td>{s.toEntity}</td>
                                <td>{s.logisticsProvider}</td>
                                <td>
                                    {s.status === 0 && (
                                        <button onClick={() => handleUpdateStatus(s.id, 'dispatchShipment')}>
                                            Dispatch
                                        </button>
                                    )}
                                    {s.status === 1 && (
                                        <button onClick={() => handleUpdateStatus(s.id, 'markInTransit')}>
                                            In Transit
                                        </button>
                                    )}
                                    {s.status === 2 && (
                                        <button onClick={() => handleUpdateStatus(s.id, 'markDelivered')}>
                                            Delivered
                                        </button>
                                    )}
                                    {s.status !== 4 && s.status < 3 && (
                                        <button onClick={() => handleUpdateStatus(s.id, 'markFailed')}>
                                            Mark Failed
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No shipments available.</p>
            )}
        </div>
    );
}

export default SupplyLogisticsComponent;
