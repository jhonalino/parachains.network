import Link from 'next/link';
import numeral from 'numeral';
import async from 'async';
import chainsConfig from '../../../configs/chainsKusama';
import uniqid from 'uniqid';
import Identicon from '@polkadot/react-identicon';

import { useEffect, useMemo, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN_ZERO, u8aConcat, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'
import { useRouter } from 'next/router'
import { Footer, Header, Head, Nav, Loader } from '../../../components';
import { isValidKusamaOrPolkadotPublicAddress, currencyPairs } from '../../../utils'
import { FixedSizeList } from 'react-window'

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

function HomePage() {

    const router = useRouter();

    const [funds, setFunds] = useState([]);

    const [loadingText, setLoadingText] = useState('');

    const [loading, setLoading] = useState(true);

    const [blockNumber, setBlockNumber] = useState(null);

    const [crowdLoanTriggerEvents, setCrowdLoanTriggerEvents] = useState([])

    const [api, setApi] = useState(null);

    const [currentFiatPrice, setCurrentFiatPrice] = useState(null);

    const [displayLogs, setDisplayLogs] = useState([]);


    useEffect(() => {

        const fetchPrice = function () {

            window.fetch(`https://polkaview.network/api/ksm/price`)
                .then(function (response) {
                    return response.json();
                })
                .then(function ({ usdPrice }) {
                    setCurrentFiatPrice(usdPrice > 0 ? usdPrice : null);
                })
                .catch(function () {
                    setCurrentFiatPrice(null);
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
                if (matchingEvents.length > 0) {

                    setCrowdLoanTriggerEvents(matchingEvents);

                }

            });

        }

        listenForNewEvents();

        return function () {

            if (typeof unsub === 'function') {
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

            setLoadingText('Querying Crowdloans');

            const chainDecimal = Math.pow(10, api.registry.chainDecimals[0]);

            var _fundEntries = await api.query.crowdloan.funds.entries();

            window.numeral = numeral;

            setLoadingText('Loading Campaigns');

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

    useEffect(() => {

        if (!api) {
            return;
        }

        const chainDecimal = Math.pow(10, api.registry.chainDecimals[0]);

        var eventsToShow = crowdLoanTriggerEvents.map(function (record, index) {

            const { event: { section, method, data, typeDef: types } } = record;

            var tmp = {
                section, method
            };

            data.forEach(function (data, index) {
                tmp[types[index].type] = data.toString()
            });

            if (tmp.Balance) {
                tmp.Balance = tmp.Balance / chainDecimal;
            }

            if (tmp.ParaId) {
                tmp = {
                    ...tmp,
                    ...(chainsConfig.filter((c) => c.paraId == tmp.ParaId)[0] || {})
                }
            }

            return tmp;

        });

        eventsToShow = eventsToShow.filter(function ({ method, section }) {

            if ((method === "Withdrew" || method === "Contributed") && section === "crowdloan") {
                return true;
            } else {
                return false;
            }

        });

        setDisplayLogs([
            ...eventsToShow
        ]);

    }, [crowdLoanTriggerEvents, api])

    const sortedFunds = useMemo(() => {

        let fundsTmp = [...funds];

        fundsTmp.sort((a, b) => {
            return b.contributorCount - a.contributorCount;
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
        return <Loader loadingText={loadingText} />
    }

    return (
        <>
            <Head title="PARACHAINS.NETWORK" />
            <div className="">
                <Header />
                <Nav />
                <div className="max-w-screen-2xl m-auto w-full min-content-height overflow-x-auto">

                    <div className="flex p-4 pb-0 overflow-x-auto flex-wrap">

                        {currentFiatPrice && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Value (KSM-USD)</span>
                                <span className="text-4xl">
                                    ${numeral(currentFiatPrice).format('0,0.00')}
                                </span>
                            </div>
                        )}

                        {(totalRaised && currentFiatPrice) && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Total Raised (USD)</span>
                                <span className="text-4xl">
                                    ${numeral(totalRaised * currentFiatPrice).format('0,0.00')}
                                </span>
                            </div>
                        )}

                        {(totalCap && currentFiatPrice) && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Total Cap (USD)</span>
                                <span className="text-4xl">
                                    ${numeral(totalCap * currentFiatPrice).format('0,0')}
                                </span>
                            </div>
                        )}

                        {blockNumber && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Current Block</span>
                                <span className="text-4xl">
                                    {numeral(blockNumber).format('0,0')}
                                </span>
                            </div>
                        )}

                    </div>

                    <div className="flex p-4 pt-0 overflow-x-auto flex-wrap">

                        {totalContributors && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Total Contributors</span>
                                <span className="text-4xl">
                                    {numeral(totalContributors).format('0,0')}
                                </span>
                            </div>
                        )}

                        {totalRaised && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Total Raised</span>
                                <span className="text-4xl">
                                    {numeral(totalRaised).format('0,0.00')} KSM
                                </span>
                            </div>
                        )}

                        {totalCap && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Total Cap</span>
                                <span className="text-4xl">
                                    {numeral(totalCap).format('0,0')} KSM
                                </span>
                            </div>
                        )}

                        {(totalRaised && totalCap) && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Total Raised / Cap</span>
                                <span className="text-4xl">
                                    {numeral((totalRaised / totalCap) * 100).format('0,0.00')}%
                                </span>
                            </div>
                        )}

                    </div>

                    <div className="flex pl-2 overflow-x-auto">
                        {displayLogs.length > 0 ? (
                            <div className="m-2 overflow-y-auto h-10 box-border min-w-max">
                                {displayLogs.map(function ({ section, method, Balance, AccountId, ParaId, text, logo }, index) {
                                    return (
                                        <div key={uniqid()} className="flex items-center mb-1 justify-start">
                                            <div className={`h-4 w-4 rounded-full box-content bg-transparent`}>
                                                <Identicon
                                                    style={{
                                                        height: '100%',
                                                        width: '100%',
                                                    }}
                                                    value={AccountId}
                                                    size={'100%'}
                                                    theme={'polkadot'}
                                                />
                                            </div>
                                            <span className="mx-2 text-yellow-100">{AccountId}</span> {method} <span className="text-yellow-200 mx-2"> {Balance} KSM</span> to
                                            <div className="w-4 h-4 rounded-full inline-block mx-1">
                                                <img className="w-full h-full rounded-full" src={`/logos/chains/${logo}`} alt={text} />
                                            </div>
                                            <span className="text-yellow-100">{text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="m-2 h-8 box-border">
                            </div>
                        )}
                    </div>

                    <div className="flex p-4 overflow-x-auto">
                        <table className="min-w-max">
                            <thead>
                                <tr>
                                    <th className="text-left" colSpan={2}>Ongoing Campaigns</th>
                                    <th className="text-right">Contributors</th>
                                    <th className="text-right">Raised (USD)</th>
                                    <th className="text-right">Raised</th>
                                    <th className="text-right">Cap</th>
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
                                                <div className="h-12 rounded-full">
                                                    <img className="h-full rounded-full" src={`/logos/chains/${logo}`} alt={text} />
                                                </div>
                                            </td>
                                            <td className="text-left text-1xl">
                                                {text}
                                            </td>
                                            <td className="text-right">
                                                <Link href={`${router.asPath}/${fundIndex}`}>
                                                    <a className="underline">
                                                        {numeral(contributorCount).format('0,0')}
                                                    </a>
                                                </Link>
                                            </td>

                                            {currentFiatPrice && (
                                                <td className="text-right">
                                                    <span className="">
                                                        ${numeral(raised * currentFiatPrice).format('0,0.00')}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="text-right">
                                                <span className="">
                                                    {numeral(raised).format('0,0.00')} KSM
                                                </span>
                                            </td>

                                            <td className="text-right">
                                                <span className="">
                                                    {numeral(cap).format('0,0')} KSM
                                                </span>
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