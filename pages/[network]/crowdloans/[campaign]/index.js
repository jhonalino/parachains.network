import { Footer, Header, Head, Nav, Loader } from '../../../../components';
import chainsConfig from '../../../../configs/chainsKusama';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router'
import numeral from 'numeral';
import uniqid from 'uniqid';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN_ZERO, u8aConcat, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Identicon from '@polkadot/react-identicon';
import async from 'async';
import { hexToString } from '@polkadot/util';

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

function getIdentityDetails(identity) {

    if (identity) {

        var judgements = identity.judgements;

        var colorMap = {
            unknown: 'text-gray-300',
            feePaid: 'text-gray-400',
            reasonable: 'text-green-400',
            knownGood: 'text-yellow-500',
            outOfDate: 'text-red-400',
            lowQuality: 'text-red-300',
            erroneous: 'text-red-500',
        };

        judgements = judgements.map(function ([index, result]) {

            var result = Object.keys(result)[0];

            return {
                index,
                result: result,
                textColorClass: colorMap[result]
            };

        });

        identity = identity.info;

        identity = {
            display: identity.display.raw ? hexToString(identity.display.raw) : "",
            legal: identity.legal.raw ? hexToString(identity.legal.raw) : "",
            web: identity.web.raw ? hexToString(identity.web.raw) : "",
            riot: identity.riot.raw ? hexToString(identity.riot.raw) : "",
            email: identity.email.raw ? hexToString(identity.email.raw) : "",
            twitter: identity.twitter.raw ? hexToString(identity.twitter.raw) : "",
            judgements: judgements,
        }

    } else {
        //explicit null cause I'm not sure what goes in identity
        // if its falsy
        //loll
        identity = null;
    }

    return identity;

}


function Campaign(props) {

    const router = useRouter();

    const [api, setApi] = useState(null);

    const [fund, setFund] = useState(null);

    const [loadingText, setLoadingText] = useState('');

    const [loading, setLoading] = useState(true);

    const [identities, setIdentities] = useState([]);

    const [currentFiatPrice, setCurrentFiatPrice] = useState(null);

    useEffect(() => {

        window.numeral = numeral;

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

            if (!api || !router.query.campaign) {
                return;
            }

            setLoadingText('Querying Crowdloans');

            const chainDecimal = Math.pow(10, api.registry.chainDecimals[0]);

            var paraId = parseInt(router.query.campaign);

            var fund = await api.query.crowdloan.funds(paraId);

            setLoadingText('Loading Campaigns');

            const fundInfo = fund.value.toJSON();

            let { cap, deposit, depositor, raised, firstPeriod, lastPeriod, end: endingBlock } = fundInfo;

            const key = createChildKey(fund.value.trieIndex)

            const keys = await api.rpc.childstate.getKeys(key, '0x')

            const KSMKeys = keys.map(k => encodeAddress(k, 2));

            const values = await Promise.all(keys.map(k => api.rpc.childstate.getStorage(key, k)));

            const contributions = values
                .map((v) => api.createType('Option<StorageData>', v))
                .map((o) =>
                    o.isSome
                        ? api.createType('Balance', o.unwrap())
                        : api.createType('Balance'))
                .map((v) => v.toJSON())
                .map((c, idx) => ({
                    address: KSMKeys[idx],
                    balance: c / chainDecimal,
                }));

            var data = {
                cap: cap / chainDecimal,
                deposit: deposit / chainDecimal,
                raised: raised / chainDecimal,
                depositor,
                firstPeriod,
                lastPeriod,
                paraId,
                endingBlock,
                contributions,
                contributorCount: keys.length,
                raisedToCapRatio: (raised / cap) * 100,
                ...(chainsConfig.filter((c) => c.paraId == paraId)[0] || {})
            };

            data.raisedF = numeral(data.raised).format('0,0');
            data.capF = numeral(data.cap).format('0,0');
            data.contributorCountF = numeral(data.contributorCount).format('0,0');

            // if component hasn't been removed yet then do ur thing 
            if (!unsub) {
                setFund(data);
                setLoading(false);
            }

        }

        loadFunds();

        return function () {
            unsub = true;
        }

    }, [api, router]);


    const sortedContributions = useMemo(() => {

        if (!fund) {
            return null;
        }

        var tmp = [
            ...fund.contributions
        ];

        if (identities.length > 0) {

            tmp = tmp.filter((t => {
                return identities.some((i) => i.address === t.address)
            }));

        }

        tmp.sort(function (a, b) {
            return b.balance - a.balance;
        });

        return tmp;

    }, [fund, identities]);

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

    useEffect(function () {
        async function fetch() {
            if (!api || 1) {
                return;
            }

            var registrars = await api.query.identity.registrars();

            registrars = registrars.toHuman();

            var councilMembers = await api.query.council.members();
            councilMembers = councilMembers.toJSON();

            var primeCouncil = await api.query.council.prime();
            primeCouncil = primeCouncil.toJSON();

            let identities = await api.query.identity.identityOf.entries();

            async.map(identities, async function ([key, identity], cb) {
                var address = key.args[0].toHuman();
                var details = await getIdentityDetails(identity.toJSON());

                var accountDetails = await api.query.system.account(address);

                const { reserved: reservedRaw, free: freeRaw } = accountDetails.toJSON().data || {}

                accountDetails = accountDetails.toHuman().data || {};

                var subs = await api.query.identity.subsOf(address);

                //get sub accounts, excluding the balance
                subs = subs.toJSON()[1];

                var nominator = await api.query.staking.nominators(address);
                var isNominator = !nominator.isEmpty;

                var validator = await api.query.staking.validators(address);
                var isValidator = !validator.isEmpty;

                var result = {
                    //make sure to check sub accounts for some flags
                    isRegistrar: registrars.some(({ account }) => account === address) || subs.some(sub => (registrars.some(({ account }) => account === sub))),
                    isCouncil: councilMembers.includes(address) || subs.some(sub => councilMembers.includes(sub)),
                    isPrimeCouncil: address === primeCouncil || subs.some((sub => primeCouncil === sub)),
                    ...accountDetails,
                    freeRaw,
                    reservedRaw,
                    subs,
                    address,
                    ...details,
                    isValidator,
                    isNominator
                };

                cb(null, result)

            }, function (err, result) {

                if (err) {
                    console.log(err, 'err');
                    return;
                }

                setIdentities(result);

            });

        }

        fetch();

        return function () {

        }

    }, [api]);

    function ContributorCard({ index, style }) {

        const { balance, address } = sortedContributions[index];

        var identity = identities.filter((i) => i.address === address)[0];

        const { display } = identity || {};

        return (
            <div style={style} className="w-full h-full flex px-4 pb-0.5">
                <div className="bg-soft-black w-full flex">
                    <div className="w-1/5 flex items-center justify-center">
                        <div className={`h-12 w-12 rounded-full box-content bg-transparent`}>
                            <Identicon
                                style={{
                                    height: '100%',
                                    width: '100%',
                                }}
                                value={address}
                                size={'100%'}
                                theme={'polkadot'}
                            />
                        </div>
                    </div>
                    <div className="w-1/2 flex items-center">
                        {address}
                    </div>
                    <div className="w-1/5 flex items-center text-yellow-200">
                        {numeral(balance).format('0,0.00')} KSM
                    </div>
                    <div className="w-1/5 flex items-center">
                        {numeral((balance / fund.raised) * 100).format('0,0.00')}%
                    </div>
                    <div className="w-1/5 flex items-center">
                        {display && display}
                    </div>
                </div>
            </div>
        );

    }

    const { raised: totalRaised, cap: totalCap, contributorCount: totalContributors, logo, paraId, text } = fund || {}

    if (loading) {
        return <Loader loadingText={loadingText} />
    }

    return (
        <>
            <Head />
            <div className="">
                <Header />
                <Nav />
                <div className="max-w-screen-2xl m-auto w-full min-content-height p-4">
                    <div className="flex p-4 pb-0 overflow-x-auto flex-wrap">
                        {paraId && (
                            <div className="flex items-center justify-center">
                                <div className="h-24 rounded-full mr-4">
                                    {logo ? (
                                        <img className="h-full rounded-full" src={`/logos/chains/${logo}`} alt={text} />
                                    ) : (
                                        <div className="h-full rounded-full w-12 flex justify-center items-center border border-para">{fundIndex}</div>
                                    )}
                                </div>
                                <span className="text-6xl">
                                    {text}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex p-4 pb-0 overflow-x-auto flex-wrap">

                        {paraId && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Fund Index</span>
                                <span className="text-4xl">
                                    {paraId}
                                </span>
                            </div>
                        )}

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
                                <span>Raised (USD)</span>
                                <span className="text-4xl">
                                    ${numeral(totalRaised * currentFiatPrice).format('0,0.00')}
                                </span>
                            </div>
                        )}

                        {(totalCap && currentFiatPrice) && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Cap (USD)</span>
                                <span className="text-4xl">
                                    ${numeral(totalCap * currentFiatPrice).format('0,0')}
                                </span>
                            </div>
                        )}

                    </div>

                    <div className="flex p-4 pt-0 overflow-x-auto flex-wrap">

                        {totalContributors && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Contributors</span>
                                <span className="text-4xl">
                                    {numeral(totalContributors).format('0,0')}
                                </span>
                            </div>
                        )}

                        {totalRaised && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Raised</span>
                                <span className="text-4xl">
                                    {numeral(totalRaised).format('0,0.00')} KSM
                                </span>
                            </div>
                        )}

                        {totalCap && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Cap</span>
                                <span className="text-4xl">
                                    {numeral(totalCap).format('0,0')} KSM
                                </span>
                            </div>
                        )}

                        {(totalRaised && totalCap) && (
                            <div className="px-8 py-4 flex flex-col justify-start m-2">
                                <span>Raised / Cap</span>
                                <span className="text-4xl">
                                    {numeral((totalRaised / totalCap) * 100).format('0,0.00')}%
                                </span>
                            </div>
                        )}

                    </div>

                    <div className="h-screen mb-24">
                        {fund && (
                            <>
                                <div className="px-4 pb-0.5">
                                    <div className="bg-soft-black w-full flex h-12 ">
                                        <div className="w-1/5 flex items-center justify-center">
                                            Contributors
                                        </div>
                                        <div className="w-1/2 flex items-center">
                                            Address
                                        </div>
                                        <div className="w-1/5 flex items-center text-yellow-200">
                                            Contribution
                                        </div>
                                        <div className="w-1/5 flex items-center">
                                            Ratio
                                        </div>
                                        <div className="w-1/5 flex items-center">
                                            {/* name */}
                                        </div>
                                    </div>
                                </div>
                                <AutoSizer>
                                    {({ width, height }) => {
                                        return (
                                            <List
                                                height={height}
                                                itemCount={sortedContributions.length}
                                                itemSize={100} //comes from manually calculating what fits
                                                width={width}
                                            >
                                                {ContributorCard}
                                            </List>
                                        )
                                    }}
                                </AutoSizer>
                            </>
                        )}
                    </div>
                </div>
                <Footer />
            </div>
        </>
    )

}

export default Campaign;