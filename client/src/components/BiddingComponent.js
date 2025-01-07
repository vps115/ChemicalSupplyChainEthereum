// src/BiddingComponent.js
import React, { useState, useEffect } from 'react';
import web3 from '../utils/web3.js';
import { bidding } from '../contracts.js';

function BiddingComponent() {
    const [account, setAccount] = useState('');
    const [chemicalId, setChemicalId] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [bids, setBids] = useState([]);
    const [logisticsBids, setLogisticsBids] = useState([]);
    const [bidId, setBidId] = useState('');
    const [offerPrice, setOfferPrice] = useState('');
    const [isChemical, setIsChemical] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                // Load bids
                const bidCount = await bidding.methods.getBidCount(true).call(); // true for chemical bids
                const bidsData = [];
                for (let id = 1; id <= bidCount; id++) {
                    try {
                        const bidDetails = await bidding.methods.getBidDetails(id, true).call();
                        const {
                            initiator,
                            chemicalId,
                            price,
                            status,
                            topBidder,
                            topOffer,
                        } = bidDetails;
                        console.log('status:', Number(status.toString()), typeof status);
                        if (initiator !== '0x0000000000000000000000000000000000000000') {
                            bidsData.push({
                                id,
                                initiator,
                                chemicalId: chemicalId.toString(),
                                price: price.toString(),
                                status: Number(status.toString()),
                                topBidder,
                                topOffer: topOffer.toString(),
                            });
                        }
                    } catch (error) {
                        console.log(error)
                    }
                }
                setBids(bidsData);

                const logisticsBidCount = await bidding.methods.getBidCount(false).call();
                const logisticsBidsData = [];

                for (let id = 1; id < logisticsBidCount; id++) {
                    try {
                        const bidDetails = await bidding.methods.getBidDetails(id, false).call();
                        const {
                            initiator,
                            chemicalId,
                            price,
                            status,
                            topBidder,
                            topOffer,
                        } = bidDetails;
                        if (bidDetails.initiator !== '0x0000000000000000000000000000000000000000') {
                            logisticsBidsData.push({
                                id,
                                initiator,
                                chemicalId: chemicalId.toString(),
                                price: price.toString(),
                                status: Number(status),
                                topBidder,
                                topOffer: topOffer.toString(),
                            });
                        }
                    } catch (error) {
                        console.log(error)
                    }
                }
                setLogisticsBids(logisticsBidsData);
            } catch (error) {
                console.error('Error loading bids:', error);
                alert('An error occurred while loading bids. Please check the console for details.');
            }
        }
        load();
    }, []);

    const handleInitiateBid = async (e) => {
        e.preventDefault();
        try {
            await bidding.methods
                .initiateChemicalBid(chemicalId, minPrice)
                .send({ from: account });
            alert('Chemical bid initiated successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error initiating bid:', error);
            alert('An error occurred during bid initiation. Please check the console for details.');
        }
    };

    const handleInitiateLogisticsBid = async (e) => {
        e.preventDefault();
        try {
            await bidding.methods
                .initiateLogisticsBid(bidId, minPrice)
                .send({ from: account });
            alert('Logistics bid initiated successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error initiating logistics bid:', error);
            alert('An error occurred during logistics bid initiation. Please check the console for details.');
        }
    };

    const handlePlaceBid = async (e) => {
        e.preventDefault();
        try {
            await bidding.methods
                .placeBid(bidId, offerPrice, isChemical)
                .send({ from: account });
            alert('Bid placed successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error placing bid:', error);
            alert('An error occurred while placing the bid. Please check the console for details.');
        }
    };

    const handleCloseBid = async (id, isChemical) => {
        try {
            await bidding.methods.closeBid(id, isChemical).send({ from: account });
            alert('Bid closed successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error closing bid:', error);
            alert('An error occurred while closing the bid. Please check the console for details.');
        }
    };

    return (
        <div>
            <h2>Bidding</h2>
            <p>Your Account: {account}</p>

            <h3>Initiate Chemical Bid (Manufacturers Only)</h3>
            <form onSubmit={handleInitiateBid}>
                <input
                    type="number"
                    placeholder="Chemical ID"
                    value={chemicalId}
                    onChange={(e) => setChemicalId(e.target.value)}
                    required
                />
                <input
                    type="number"
                    placeholder="Minimum Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    required
                />
                <button type="submit">Initiate Bid</button>
            </form>

            <h3>Initiate Logistics Bid</h3>
            <form onSubmit={handleInitiateLogisticsBid}>
                <input
                    type="number"
                    placeholder="Chemical Bid ID"
                    value={bidId}
                    onChange={(e) => setBidId(e.target.value)}
                    required
                />
                <input
                    type="number"
                    placeholder="Maximum Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    required
                />
                <button type="submit">Initiate Logistics Bid</button>
            </form>

            <h3>Place Bid</h3>
            <form onSubmit={handlePlaceBid}>
                <input
                    type="number"
                    placeholder="Bid ID"
                    value={bidId}
                    onChange={(e) => setBidId(e.target.value)}
                    required
                />
                <input
                    type="number"
                    placeholder="Offer Price"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    required
                />
                <select value={isChemical} onChange={(e) => setIsChemical(e.target.value === 'true')}>
                    <option value="true">Chemical Bid</option>
                    <option value="false">Logistics Bid</option>
                </select>
                <button type="submit">Place Bid</button>
            </form>

            <h3>Active Chemical Bids</h3>
            {bids.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Bid ID</th>
                            <th>Chemical ID</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Top Bidder</th>
                            <th>Top Offer</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bids.map((b, index) => (
                            <tr key={index}>
                                <td>{b.id}</td>
                                <td>{b.chemicalId}</td>
                                <td>{b.price}</td>
                                <td>{b.status === 0 ? 'Open' : 'Closed'}</td>
                                <td>{b.topBidder}</td>
                                <td>{b.topOffer}</td>
                                <td>
                                    {b.status === 0 && (
                                        <button onClick={() => handleCloseBid(b.id, true)}>Close Bid</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No active bids available.</p>
            )}

            <h3>Active Logistics Bids</h3>
            {logisticsBids.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Bid ID</th>
                            <th>Chemical ID</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Top Bidder</th>
                            <th>Top Offer</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logisticsBids.map((b, index) => (
                            <tr key={index}>
                                <td>{b.id}</td>
                                <td>{b.chemicalId}</td>
                                <td>{b.price}</td>
                                <td>{b.status === 0 ? 'Open' : 'Closed'}</td>
                                <td>{b.topBidder}</td>
                                <td>{b.topOffer}</td>
                                <td>
                                    {b.status === 0 && (
                                        <button onClick={() => handleCloseBid(b.id, false)}>Close Bid</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No active logistics bids available.</p>
            )}

        </div>
    );
}

export default BiddingComponent;
