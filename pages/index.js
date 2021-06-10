import React, { useEffect, useState } from 'react';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { BN_ZERO, u8aConcat, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'
import { useRouter } from 'next/router'
import Head from '../components/Head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import queryString from 'query-string';
import Link from 'next/link';
import { isValidKusamaOrPolkadotPublicAddress } from '../utils'
import currencyPairs from '../utils/currencyPairs'
import { loadGetInitialProps } from 'next/dist/next-server/lib/utils';
import numeral from 'numeral';
import chainsConfig from '../configs/chainsKusama';
import async from 'async';

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

    useEffect(() => {

        async function useApi() {

            setLoadingText('connecting to kusama node');

            let wsUrl = 'wss://kusama-node.polkaview.network';

            wsUrl = 'wss://kusama-rpc.polkadot.io';

            wsUrl = 'ws://104.238.205.8:9302';

            const wsProvider = new WsProvider(wsUrl);

            const api = new ApiPromise({ provider: wsProvider });

            await api.isReady;
            // expose api for testing
            window.api = api;


            setLoadingText('querying crowdloans');

            const chainDecimal = Math.pow(10, api.registry.chainDecimals[0]);

            var _fundEntries = await api.query.crowdloan.funds.entries();

            window.numeral = numeral;

            setLoadingText('loading para funds');

            async.map(_fundEntries, async function ([{ args: fundIndex }, value], cb) {

                fundIndex = fundIndex.toString();


                const fundInfo = value.toJSON();

                let { cap, deposit, depositor, raised, firstPeriod, lastPeriod } = fundInfo;

                const key = createChildKey(value.value.trieIndex)

                const keys = await api.rpc.childstate.getKeys(key, '0x')


                cb(null, {
                    cap: cap / chainDecimal,
                    deposit: deposit / chainDecimal,
                    raised: raised / chainDecimal,
                    depositor,
                    firstPeriod,
                    lastPeriod,
                    fundIndex,
                    contributorCount: keys.length,
                    raisedToCapRatio: (raised / cap) * 100,
                    ...(chainsConfig.filter((c) => c.paraId == fundIndex)[0] || {})
                });

            }, function (err, result) {

                if (err) {
                    console.log(err, 'err');
                    return;
                }

                setFunds(result);
                setLoading(false);

            });


        }

        useApi();

    }, []);


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
            <Head />
            <div className="">
                <Header />
                <div className="max-w-screen-2xl m-auto w-full min-content-height">
                    <div className="flex flex-wrap p-4">
                        {funds.map(function ({ cap, fundIndex, deposit, depositor, firstPeriod, lastPeriod, logo, text, homepage, raised, raisedToCapRatio, contributorCount }) {
                            return (
                                <div key={fundIndex} className="w-full my-4">
                                    <div className="flex flex-col">
                                        <div className="flex">
                                            <div className="rounded-full w-24 h-24 p-2">
                                                <img className="w-full h-full rounded-full" src={`/logos/chains/${logo}`} alt={text} />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <div>
                                                    <span className="text-4xl">{text}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-light">{fundIndex}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-end mb-2">
                                            <div className="text-gray-900 flex flex-col m-4 w-24">
                                                <span className="font-light text-2xl text-right">
                                                    {firstPeriod} - {lastPeriod}
                                                </span>
                                                <span className="text-xs font-light text-right">leases</span>
                                            </div>
                                            <div className="text-gray-900 flex flex-col m-4 w-24 text-right">
                                                <span className="font-light text-2xl">
                                                    {numeral(contributorCount).format('0,0')}
                                                </span>
                                                <span className="text-xs font-light">contributors</span>
                                            </div>
                                            <div className="text-gray-900 flex flex-col m-4 w-48">
                                                <span className="font-light text-2xl text-right">
                                                    {numeral(cap).format('0,0')} KSM
                                                </span>
                                                <span className="text-xs font-light text-right">cap</span>
                                            </div>

                                            <div className="text-gray-900 flex flex-col m-4 w-48 text-right">
                                                <span className="font-light text-2xl">
                                                    {numeral(raised).format('0,0')} KSM
                                                </span>
                                                <span className="text-xs font-light">raised</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative pt-1">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-pink-600 bg-pink-200">
                                                    {numeral(raised).format('0,0')} / {numeral(cap).format('0,0')} KSM raised
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold inline-block text-pink-600">
                                                    {numeral(raisedToCapRatio).format('0.0')}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-pink-200">
                                            <div style={{ width: `${raisedToCapRatio}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pink-500"></div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <Footer />
            </div>
        </>
    );

}

export default HomePage;