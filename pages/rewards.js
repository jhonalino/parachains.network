import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router'
import Calendar from 'react-calendar';
import Head from '../components/Head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import { collectRewards } from '../backend/src/index';
import numeral from 'numeral';

function toShortAddress(_address) {

    const address = (_address || '');

    return (address.length > 13)
        ? `${address.slice(0, 6)}…${address.slice(-6)}`
        : address;

}

function Rewards() {

    const router = useRouter();

    const [rewardsSummaryList, setRewardsSummaryList] = useState([]);
    const [dailyRewardsList, setDailyRewardsList] = useState([]);
    const [overallRewardsInfo, setOverallRewardsInfo] = useState({});
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1);
    const [loadingText, setLoadingText] = useState("Calculating Your Rewards");

    useEffect(() => {

        let {
            startMonth, startDate, startYear, endMonth, endDate, endYear,
            selectedCurrency,
            addresses
        } = router.query;

        if (!addresses) {
            return;
        }

        addresses = JSON.parse(addresses);

        var userInput = {
            start: `${startYear}-${startMonth}-${startDate}`,
            end: `${endYear}-${endMonth}-${endDate}`,
            currency: selectedCurrency,
            priceData: (selectedCurrency != -1).toString(),
            addresses
        };

        async function _collectRewards() {

            console.log('userinput', userInput);

            var [rewardsListCombo, _info] = await collectRewards(userInput);

            var _rewardsSummaryList = [];
            var _dailyRewardsList = [];

            rewardsListCombo.forEach(function (rewards) {

                var summary = {
                    ...rewards,
                    ...rewards.data
                };

                var dailyRewards = summary.list

                delete summary.list;
                delete summary.data;

                _rewardsSummaryList.push(summary)
                _dailyRewardsList.push(dailyRewards)

            });

            setDailyRewardsList(_dailyRewardsList);
            setRewardsSummaryList(_rewardsSummaryList);
            setOverallRewardsInfo(_info);

        }

        _collectRewards();

    }, [router.query])

    const parseSimpleDateToLocalDate = (simpleDate) => {
        //simpleDate format
        //DD-MM-YYY
        //"04-02-2021"

        const [day, month, year] = simpleDate.split('-');

        //remember month is zero index
        return new Date(year, parseInt(month) - 1, day).toLocaleDateString();

    }

    const currencyUsed = overallRewardsInfo.currency != -1 ? overallRewardsInfo.currency : null;

    const handleSelectedIndexToggle = (index) => {

        if (index === selectedAddressIndex) {
            setSelectedAddressIndex(-1);
        } else {
            setSelectedAddressIndex(index);
        }

    }
    return (
        <>
            <Head />
            <div>
                <Header />
                <div className="w-full">
                    <div className="max-w-screen-2xl m-auto w-full min-content-height">
                        {rewardsSummaryList.length > 0 ? (
                            <div className="overflow-x-auto p-4">
                                <table className="table-auto bg-white w-full" >
                                    <thead>
                                        <tr>
                                            <th className="whitespace-nowrap text-left font-normal">Address</th>
                                            <th className="whitespace-nowrap text-left font-normal">Network</th>
                                            <th className="whitespace-nowrap text-right font-normal">Date Range</th>
                                            <th className="whitespace-nowrap text-right font-normal">Payouts Count</th>
                                            <th className="whitespace-nowrap text-right font-normal">APY</th>
                                            <th className="whitespace-nowrap text-right font-normal">Starting Balance</th>
                                            <th className="whitespace-nowrap text-right font-normal">Rewards</th>
                                            <th className="whitespace-nowrap text-right font-normal">Value{currencyUsed ? `(${currencyUsed})` : ''}</th>
                                            <th className="whitespace-nowrap text-right font-normal">Daily Value{currencyUsed ? `(${currencyUsed})` : ''}</th>
                                            <th className="whitespace-nowrap text-left font-normal">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rewardsSummaryList.map(function (summary, index) {

                                            let { address, network, firstReward, lastReward, numberRewardsParsed: payoutCount, annualizedReturn, currency, message,
                                                suffix, startBalance, totalAmountHumanReadable: stakingRewardsTotal, totalValueFiat, currentValueRewardsFiat } = summary;

                                            if (message != "data collection complete") {
                                                return (
                                                    <tr key={address} className="whitespace-nowrap">
                                                        <td colSpan={10}>{message} - {address}</td>
                                                    </tr>
                                                );
                                            }

                                            if (selectedAddressIndex != -1 && selectedAddressIndex != index) {
                                                return null;
                                            }

                                            return (
                                                <tr key={address} className="whitespace-nowrap">
                                                    <td className="text-left">{toShortAddress(address)}</td>
                                                    <td className="text-left">{network}</td>
                                                    <td className="text-right">{parseSimpleDateToLocalDate(firstReward)} -> {parseSimpleDateToLocalDate(lastReward)}</td>
                                                    <td className="text-right">{payoutCount}</td>
                                                    {startBalance == "" ? (
                                                        <>
                                                            <td className="text-right"> - </td>
                                                            <td className="text-right"> - </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="text-right">{numeral(annualizedReturn).format('0.00')}%</td>
                                                            <td className="text-right">
                                                                <div className="flex flex-col items-end">
                                                                    {numeral(startBalance).format('0,0.00')}
                                                                    <span className="text-xs text-gray-600">
                                                                        {suffix.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="text-right">
                                                        <div className="flex flex-col items-end">
                                                            {numeral(stakingRewardsTotal).format('0,0.00')}
                                                            <span className="text-xs text-gray-600">
                                                                {suffix.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {currency == -1 ? (
                                                        <td className="text-right"> - </td>
                                                    ) : (
                                                        <td className="text-right">
                                                            <div className="flex flex-col">
                                                                {numeral(currentValueRewardsFiat).format('0,0.00')}
                                                                <span className="text-xs text-gray-600">
                                                                    {currency}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    {currency == -1 ? (
                                                        <td className="text-right"> - </td>
                                                    ) : (
                                                        <td className="text-right">
                                                            <div className="flex flex-col">
                                                                {numeral(totalValueFiat).format('0,0.00')}
                                                                <span className="text-xs text-gray-600">
                                                                    {currency}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="text-right">
                                                        <button className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 border-b-4 border-blue-700 hover:border-blue-500 rounded mr-2 text-xs"
                                                            onClick={() => {
                                                                handleSelectedIndexToggle(index);
                                                            }}
                                                        >
                                                            {selectedAddressIndex === index ? 'HIDE' : 'VIEW'}
                                                        </button>
                                                        <button className="bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 border-b-4 border-green-700 hover:border-green-500 rounded mr-2 text-xs">
                                                            CSV
                                                        </button>
                                                        <button className="bg-purple-500 hover:bg-purple-400 text-white font-bold py-2 px-4 border-b-4 border-purple-700 hover:border-purple-500 rounded mr-2 text-xs">
                                                            JSON
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div>
                                {loadingText}...
                            </div>
                        )}
                        {(selectedAddressIndex != -1) && (
                            <>
                                <div className="overflow-x-auto p-4">
                                    <div className="m-auto overflow-y-auto max-h-96">
                                        <table className="table-auto bg-white w-full">
                                            <thead>
                                                <tr>
                                                    <th className="whitespace-nowrap text-right font-normal">Day</th>
                                                    <th className="whitespace-nowrap text-right font-normal">Price{currencyUsed ? `(${currencyUsed})` : ''}</th>
                                                    <th className="whitespace-nowrap text-right font-normal">DOT Volume</th>
                                                    <th className="whitespace-nowrap text-right font-normal">DOT Rewards</th>
                                                    <th className="whitespace-nowrap text-right font-normal">Payouts Count</th>
                                                    <th className="whitespace-nowrap text-right font-normal">Value{currencyUsed ? `(${currencyUsed})` : ''}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dailyRewardsList[selectedAddressIndex].map(function ({ day, price, volume, amountHumanReadable: dotReward, numberPayouts, valueFiat }) {
                                                    return (
                                                        <tr key={day} className="whitespace-nowrap">
                                                            <td className="text-right">{day}</td>
                                                            <td className="text-right">{price}</td>
                                                            <td className="text-right">{numeral(volume).format('0.00 a')}</td>
                                                            <td className="text-right">{numeral(dotReward).format('0.00')}</td>
                                                            <td className="text-right">{numberPayouts}</td>
                                                            <td className="text-right">
                                                                <div className="flex flex-col">
                                                                    {numeral(valueFiat).format('0,0.00')}
                                                                    <span className="text-xs text-gray-600">
                                                                        {currencyUsed}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <div className="px-4 py-1 my-4 max-w-xs">
                            <Link href="/">
                                <button className="w-full bg-blue-500 hover:bg-blue-700 text-white font-light py-2 px-4 rounded">
                                    calculate again
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        </>
    );

}

export default Rewards;

