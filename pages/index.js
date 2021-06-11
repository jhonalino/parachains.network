import React, { useEffect, useState } from 'react';
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

    useEffect(() => {

        async function useApi() {

            setLoadingText('connecting to kusama node');

            let wsUrl = 'wss://kusama-node.polkaview.network';

            wsUrl = 'wss://kusama-rpc.polkadot.io';

            // wsUrl = 'ws://104.238.205.8:9302';

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

                var data = {
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
            <Head title="PARACHAINS.NETWORK" />
            <div className="">
                <Header />
                <div className="max-w-screen-2xl m-auto w-full min-content-height overflow-x-auto">
                    <div className="flex p-4 overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-right">#</th>
                                    <th className="text-left" colSpan={2}>parachains</th>
                                    <th className="text-right">lease period</th>
                                    <th className="text-right">contributors</th>
                                    <th className="text-right">raised</th>
                                    <th className="text-right">cap</th>
                                    <th className="text-right">raised / cap</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {funds.map(function ({ cap, fundIndex, deposit, depositor, firstPeriod, lastPeriod, logo, text, homepage, raised, raisedToCapRatio, contributorCount }) {
                                    return (
                                        <tr key={fundIndex} >
                                            <td className="text-right">
                                                {fundIndex}
                                            </td>
                                            <td className="">
                                                <div className="w-12 h-12 rounded-full">
                                                    <img className="w-full h-full rounded-full" src={`/logos/chains/${logo}`} alt={text} />
                                                </div>
                                            </td>
                                            <td className="text-left text-2xl">
                                                {text}
                                            </td>
                                            <td className="text-right">
                                                {firstPeriod} - {lastPeriod}
                                            </td>
                                            <td className="text-right">
                                                {numeral(contributorCount).format('0,0')}
                                            </td>
                                            <td className="text-right">
                                                <span className="">
                                                    {numeral(raised).format('0,0')} KSM
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <span className="">
                                                    {numeral(cap).format('0,0')} KSM
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
                                                        <span className="text-xs inline-block text-blue-600 font-bold">
                                                            {numeral(raisedToCapRatio).format('0.0')}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                                                    <div style={{ width: `${raisedToCapRatio}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                                                </div>
                                            </td>

                                            <td className="text-right">
                                                <button className="bg-blue-500 blue:bg-pink-400 text-white font-bold py-2 px-4 border-b-4 border-blue-700 hover:blue-pink-500 rounded">
                                                    View
                                                </button>
                                            </td>
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