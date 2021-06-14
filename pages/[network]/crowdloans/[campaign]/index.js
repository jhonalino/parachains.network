import { Footer, Header, Head, Nav } from '../../../../components';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router'

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

function Campaign(props) {

    const router = useRouter();

    const [api, setApi] = useState(null);

    const [loadingText, setLoadingText] = useState('');

    const [loading, setLoading] = useState(true);
    // var a = await api.query.crowdloan.funds(2000)

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

            // if component hasn't been removed yet then do ur thing 
            if (!unsub) {
                setFunds(result);
                setLoading(false);
            }



        }

        loadFunds();

        return function () {
            unsub = true;
        }

    }, [api]);

    return (
        <>
            <Head />
            <div className="">
                <Header />
                <Nav />
                <div className="max-w-screen-2xl m-auto w-full min-content-height p-4">
                    coming soon
                    {loadingText}...
                </div>
                <Footer />
            </div>
        </>
    )

}

export default Campaign;