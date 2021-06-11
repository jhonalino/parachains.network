import React, { useEffect, useMemo, useState } from 'react';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { BN_ZERO, u8aConcat, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'
import numeral from 'numeral';
import async from 'async';
import { useRouter } from 'next/router'
import Head from '../components/Head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import queryString from 'query-string';
import Link from 'next/link';
import { isValidKusamaOrPolkadotPublicAddress } from '../utils'
import currencyPairs from '../utils/currencyPairs'
import { loadGetInitialProps } from 'next/dist/next-server/lib/utils';
import chainsConfig from '../configs/chainsKusama';
import { FixedSizeList } from 'react-window'

function toShortAddress(_address) {

    const address = (_address || '');

    return (address.length > 13)
        ? `${address.slice(0, 6)}…${address.slice(-6)}`
        : address;

}

function createChildKey(trieIndex) {
    return u8aToHex(
        u8aConcat(
            ':child_storage:default:',
            blake2AsU8a(
                u8aConcat('crowdloan', trieIndex.toU8a())
            )
        )
    );
}

const areAddressesValid = function (addresses) {

    if (!Array.isArray(addresses)) {
        return [false, 'not an array'];
    }

    if (addresses.length <= 0) {
        return [false, 'no address found'];
    }

    for (let i = 0; i < addresses.length; i++) {

        let address = addresses[i];
        if (address.error) {
            return [false, address.error];
        }

        if (!address.address) {
            return [false, 'missing an addresss'];
        }

        if (!address.network) {
            return [false, 'invalid address'];
        }

    }

    return [true];

};
function HomePage() {

    const router = useRouter();

    const [funds, setFunds] = useState([]);

    const [loadingText, setLoadingText] = useState('');

    const [loading, setLoading] = useState(true);

    const [blockNumber, setBlockNumber] = useState(null);

    const [crowdLoanTriggerEvents, setCrowdLoanTriggerEvents] = useState([])

    const [api, setApi] = useState(null);

    const [currentFiatPrice, setCurrentFiatPrice] = useState(null);

    useEffect(() => {

        const fetchPrice = function () {

            window.fetch(`https://polkaview.network/api/ksm/price`)
                .then(function (response) {
                    return response.json();
                })
                .then(function ({ usdPrice }) {
                    console.log('price fetch', usdPrice);
                    setCurrentFiatPrice(usdPrice > 0 ? usdPrice : null);
                })
                .catch(function () {
                    setCurrentFiatPrice(usdPrice);
                });

        };

        let intervalId = window.setInterval(fetchPrice, 1000 * 60) //1 minute

        fetchPrice();

        return function () {

            window.clearInterval(intervalId);

        };

    }, [])

    useEffect(() => {

        if (!api) {
            return;
        }

        let unsub;

        var crowdLoanEventsToListen = [
            // these trigger a full refresh of the keys
            api.events.crowdloan.Dissolved,
            api.events.crowdloan.AllRefunded,
            api.events.crowdloan.PartiallyRefunded,
            // these trigger a delta adjustment
            // can be done with a delta adjustment
            //so optimized this in the future
            api.events.crowdloan.Contributed,
            api.events.crowdloan.Withdrew
        ];

        async function listenForNewEvents() {

            // Subscribe to system events via storage
            unsub = await api.query.system.events((events) => {


                //listen for event that matches and return them;
                var matchingEvents = events.filter(function (record) {
                    return record && crowdLoanEventsToListen.some(c => c && c.is(record.event));
                });

                //if any of the events I'm interester are triggered
                //then set this, for those who are listening
                if (matchingEvents.length) {
                    console.log('setting');
                    setCrowdLoanTriggerEvents(matchingEvents);
                }

            });

        }

        listenForNewEvents();

        return function () {

            if (typeof unsub === 'function') {
                console.log('unsubbbing');
                unsub();
            }

        };

    }, [api]);

    useEffect(() => {

        if (!api) {
            return;
        }

        let unsub;

        async function listenForNewBlocks() {

            unsub = await api.rpc.chain.subscribeFinalizedHeads(({ number }) => {
                setBlockNumber(number.toString());
            });

        }

        listenForNewBlocks();

        return function () {

            if (typeof unsub === 'function') {
                unsub();
            }

        };

    }, [api])

    useEffect(() => {

        async function useApi() {

            setLoadingText('Connecting to kusama node');

            let wsUrl = 'wss://kusama-node.polkaview.network';

            wsUrl = 'wss://kusama-rpc.polkadot.io';

            // wsUrl = 'ws://104.238.205.8:9302';

            const wsProvider = new WsProvider(wsUrl);

            const api = new ApiPromise({ provider: wsProvider });

            await api.isReady;
            // expose api for testing
            window.api = api;

            setApi(api);
        }

        useApi();

    }, []);

    useEffect(() => {

        var unsub = false;

        async function loadFunds() {

            if (!api) {
                return;
            }

            setLoadingText('Querying crowdloans');

            const chainDecimal = Math.pow(10, api.registry.chainDecimals[0]);

            var _fundEntries = await api.query.crowdloan.funds.entries();

            window.numeral = numeral;

            setLoadingText('Loading para funds');

            async.map(_fundEntries, async function ([{ args: fundIndex }, value], cb) {

                fundIndex = fundIndex.toString();


                const fundInfo = value.toJSON();

                let { cap, deposit, depositor, raised, firstPeriod, lastPeriod, end: endingBlock } = fundInfo;

                const key = createChildKey(value.value.trieIndex)

                const keys = await api.rpc.childstate.getKeys(key, '0x')

                var data = {
                    cap: cap / chainDecimal,
                    deposit: deposit / chainDecimal,
                    raised: raised / chainDecimal,
                    depositor,
                    firstPeriod,
                    lastPeriod,
                    fundIndex,
                    endingBlock,
                    contributorCount: keys.length,
                    raisedToCapRatio: (raised / cap) * 100,
                    ...(chainsConfig.filter((c) => c.paraId == fundIndex)[0] || {})
                };

                data.raisedF = numeral(data.raised).format('0,0');
                data.capF = numeral(data.cap).format('0,0');
                data.contributorCountF = numeral(data.contributorCount).format('0,0');

                cb(null, data);

            }, function (err, result) {

                if (err) {
                    console.log(err, 'err');
                    return;
                }

                // if component hasn't been removed yet then do ur thing 
                if (!unsub) {
                    setFunds(result);
                    setLoading(false);
                }

            });


        }

        loadFunds();

        return function () {
            unsub = true;
        }

    }, [api, crowdLoanTriggerEvents]);

    const sortedFunds = useMemo(() => {

        let fundsTmp = [...funds];

        fundsTmp.sort((a, b) => {
            return b.raised - a.raised;
        });

        return fundsTmp;

    }, [funds])

    const { totalContributors, totalRaised, totalCap } = useMemo(() => {

        return funds.reduce(function (accumulator, current) {

            if (!accumulator) {

                return {
                    totalContributors: current.contributorCount,
                    totalRaised: current.raised,
                    totalCap: current.cap,
                };

            } else {

                return {
                    totalContributors: accumulator.totalContributors + current.contributorCount,
                    totalRaised: accumulator.totalRaised + current.raised,
                    totalCap: accumulator.totalCap + current.cap,
                };

            }

        }, null) || {};

    }, [funds])

    if (loading) {
        return (
            <>
                <Head />
                <div className="">
                    <Header />
                    <div className="max-w-screen-2xl m-auto w-full min-content-height">
                        {loadingText}...
                    </div>
                    <Footer />
                </div>
            </>
        )
    }

    return (
        <>
            <Head title="PARACHAINS.NETWORK" />
            <div className="">
                <Header />
                <div className="max-w-screen-2xl m-auto w-full min-content-height overflow-x-auto">
                    <div className="flex p-4 pb-0 overflow-x-auto flex-wrap">

                        {totalContributors && (
                            <div className="bg-soft-black px-8 py-4 flex flex-col justify-start text-right m-2">
                                <span>Total Contributors</span>
                                <span className="text-4xl">
                                    {numeral(totalContributors).format('0,0')}
                                </span>
                            </div>
                        )}

                        {totalRaised && (
                            <div className="bg-soft-black px-8 py-4 flex flex-col justify-start text-right m-2">
                                <span>Total Raised</span>
                                <span className="text-4xl">
                                    {numeral(totalRaised).format('0,0')} KSM
                                </span>
                            </div>
                        )}

                        {totalCap && (
                            <div className="bg-soft-black px-8 py-4 flex flex-col justify-start text-right m-2">
                                <span>Total Cap</span>
                                <span className="text-4xl">
                                    {numeral(totalCap).format('0,0')} KSM
                                </span>
                            </div>
                        )}

                        {blockNumber && (
                            <div className="bg-soft-black px-8 py-4 flex flex-col justify-start text-right m-2">
                                <span>Current Block</span>
                                <span className="text-4xl">
                                    {numeral(blockNumber).format('0,0')}
                                </span>
                            </div>
                        )}

                    </div>

                    <div className="flex p-4 pt-0 overflow-x-auto flex-wrap">
                        {currentFiatPrice && (
                            <div className="bg-soft-black px-8 py-4 flex flex-col justify-start text-right m-2">
                                <span>Value (KSM-USD)</span>
                                <span className="text-4xl">
                                    ${numeral(currentFiatPrice).format('0,0.00')}
                                </span>
                            </div>
                        )}

                        {(totalRaised && currentFiatPrice) && (
                            <div className="bg-soft-black px-8 py-4 flex flex-col justify-start text-right m-2">
                                <span>Total Raised (USD)</span>
                                <span className="text-4xl">
                                    ${numeral(totalRaised * currentFiatPrice).format('0,0')}
                                </span>
                            </div>
                        )}

                        {(totalCap && currentFiatPrice) && (
                            <div className="bg-soft-black px-8 py-4 flex flex-col justify-start text-right m-2">
                                <span>Total Cap (USD)</span>
                                <span className="text-4xl">
                                    ${numeral(totalCap * currentFiatPrice).format('0,0')}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex p-4 overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left" colSpan={2}>Parachains</th>
                                    <th className="text-right">Contributors</th>
                                    <th className="text-right">Raised (USD)</th>
                                    <th className="text-right">Raised</th>
                                    <th className="text-right">Cap</th>
                                    <th className="text-right">Raised / Cap</th>
                                    <th className="text-right">Lease Period</th>
                                    <th className="text-right">Ending Block</th>
                                    <th>Homepage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedFunds.map(function ({ cap, fundIndex, deposit, depositor, firstPeriod, lastPeriod, logo, text,
                                    endingBlock,
                                    homepage, raised, raisedToCapRatio, contributorCount }) {
                                    return (
                                        <tr key={fundIndex} >
                                            <td className="">
                                                <div className="w-12 h-12 rounded-full">
                                                    <img className="w-full h-full rounded-full" src={`/logos/chains/${logo}`} alt={text} />
                                                </div>
                                            </td>
                                            <td className="text-left text-1xl">
                                                {text}
                                            </td>
                                            <td className="text-right">
                                                {numeral(contributorCount).format('0,0')}
                                            </td>

                                            {currentFiatPrice && (
                                                <td className="text-right">
                                                    <span className="">
                                                        ${numeral(raised * currentFiatPrice).format('0,0')}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="text-right">
                                                <span className="">
                                                    {numeral(raised).format('0,0')} KSM
                                                </span>
                                            </td>

                                            <td className="text-right">
                                                <span className="">
                                                    {numeral(cap).format('0.0a')} KSM
                                                </span>
                                            </td>

                                            <td className="relative pt-1">
                                                <div className="flex mb-2 items-center justify-between">
                                                    <div>
                                                        <span className="text-xs inline-block py-1 px-2 rounded-full">
                                                            {numeral(raised).format('0,0')} / {numeral(cap).format('0,0')} KSM
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs inline-block text-para font-bold">
                                                            {numeral(raisedToCapRatio).format('0.0')}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-para bg-opacity-25">
                                                    <div style={{ width: `${raisedToCapRatio}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-para"></div>
                                                </div>
                                            </td>

                                            <td className="text-right">
                                                {firstPeriod} - {lastPeriod}
                                            </td>
                                            <td className="text-right">
                                                {numeral(endingBlock).format('0,0')}
                                            </td>

                                            {homepage && (
                                                <td className="text-right">
                                                    <a href={homepage} className="border border-para rounded-sm bg-transparent px-4 py-2">
                                                        View
                                                    </a>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <Footer />
            </div>
        </>
    );

}

export default HomePage;