import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router'
import Calendar from 'react-calendar';
import Head from '../components/Head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import queryString from 'query-string';
import Link from 'next/link';

import { isValidKusamaOrPolkadotPublicAddress } from '../utils'
import currencyPairs from '../utils/currencyPairs'

var addressTemplate = {
    name: "",
    startBalance: "",
    address: ""
};

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

const areDateRangeValid = function (dateRangeArray) {

    if (dateRangeArray.length != 2) {
        return [false, 'invalid date range array count, must be 2'];
    }

    return [true];

}

function HomePage() {

    const router = useRouter();

    const [selectedDates, onChange] = useState([new Date(), new Date()]);

    const [startDate, endDate] = Array.isArray(selectedDates) ? selectedDates : []

    const [submitError, setSubmitError] = useState();

    // Specify an address to test.

    const [addresses, setAddresses] = useState([
        { ...addressTemplate } //always start with one address template
    ]);

    const [selectedCurrency, setSelectedCurrency] = useState('-1');

    const handleCalculateRewardsClick = function () {

        var newUrl = `/rewards`;

        let [validAddresses, errorMsgAddress] = areAddressesValid(addresses);

        let [validDateRange, errorMsgDate] = areDateRangeValid(selectedDates);

        if (validAddresses && validDateRange) {

            let parsed = queryString.parse(location.search);

            let newQs = {
                addresses: JSON.stringify(addresses),
                startMonth: selectedDates[0].getMonth() + 1,
                startDate: selectedDates[0].getDate(),
                startYear: selectedDates[0].getFullYear(),
                endMonth: selectedDates[1].getMonth() + 1,
                endDate: selectedDates[1].getDate(),
                endYear: selectedDates[1].getFullYear(),
                selectedCurrency
            };

            var stringified = queryString.stringify(newQs, { skipNull: true });


            newUrl += `?${stringified}`;

            router.push(newUrl);

        } else {
            setSubmitError(errorMsgAddress);
        }

    };

    const handleSelectedCurrencyChange = function (event) {
        setSelectedCurrency(event.target.value);
    };

    const handleAddressChange = function (event, index) {

        let newAddress = {
            ...addresses[index]
        };

        newAddress[event.target.name] = event.target.value;

        const [success, result] = isValidKusamaOrPolkadotPublicAddress(newAddress.address);

        newAddress.error = null;
        newAddress.network = null;

        //if success then result contains the network
        //otherwise just set to null
        if (success) {
            newAddress.network = result;
        } else if (newAddress.address) {
            //if new address is not an empty string 
            //but there is an error
            newAddress.error = 'please enter a valid kusama or polkadot public address';
        }

        let newAddresses = [
            ...addresses
        ];

        newAddresses[index] = newAddress;

        setAddresses(newAddresses);

    };

    const handleRemoveAddressClick = function (index) {

        var newAddress = [
            ...addresses
        ];

        newAddress.splice(index, 1);

        setAddresses(newAddress);

    }

    const handleAddAddressClick = function () {

        var newAddresses = [
            ...addresses
        ];

        newAddresses.push({ ...addressTemplate });

        setAddresses(newAddresses);

    }
    console.log(selectedDates[0].getMonth());
    return (
        <>
            <Head />
            <div className="">
                <Header />
                <div className="max-w-screen-sm m-auto w-full min-content-height">
                    <div className="mb-2">
                        {addresses.map(function ({ name, address, startBalance, network, error }, index) {
                            return (
                                <div className="mb-2" key={index}>
                                    <div className="px-4 py-1" >
                                        <label htmlFor="address" className="form-label">Kusama / Polkadot Public Address</label>
                                        <div className="">
                                            <input maxLength={100} id="address" name="address" value={address} onChange={(event) => {
                                                handleAddressChange(event, index);
                                            }} className="w-full py-2 px-4 rounded-sm focus:outline-none" type="text" placeholder="15fTw39Ju2jJiHeGe1fJ5DtgugUauy9tr2HZuiRNFwqnGQ1Q" />
                                        </div>
                                        {error ? (
                                            <p className="text-xs text-red-500 pt-1">{error}</p>
                                        ) : (
                                            <>
                                                {network && (
                                                    <p className="text-xs text-green-500 pt-1 w-full flex items-center">
                                                        <span className="mr-1">{network}</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>

                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="px-4 py-1">
                                        <label htmlFor="startBalance" className="form-label">Starting Balance (Optional)</label>
                                        <div className="">
                                            <input className="w-full py-2 px-4 rounded-sm focus:outline-none" value={startBalance}
                                                name="startBalance" onChange={(event) => handleAddressChange(event, index)}
                                                type="number" placeholder="1000" />
                                        </div>
                                    </div>
                                    <div className="px-4 py-1">
                                        <label htmlFor="name" className="form-label">Name (Optional)</label>
                                        <div className="">
                                            <input maxLength={70} className="w-full py-2 px-4 rounded-sm focus:outline-none"
                                                value={name} type="text" placeholder={`Account 0${index}`}
                                                name="name" onChange={(event) => handleAddressChange(event, index)}
                                            />
                                        </div>
                                    </div>
                                    {
                                        addresses.length > 1 && (
                                            <div className="px-4 mt-4 relative">
                                                <div className="border-b border-l border-r h-3 border-red-400 border-opacity-40"></div>
                                                <p className="bg-transparent text-red-500 cursor-pointer text-center underline"
                                                    onClick={() => {
                                                        handleRemoveAddressClick(index);
                                                    }}
                                                >
                                                    remove
                                            </p>
                                            </div>
                                        )
                                    }
                                </div>
                            );
                        })}

                        {addresses.length < 3 && (
                            <div className="px-4 mt-4">
                                <p className="bg-transparent text-blue-500 cursor-pointer text-right underline"
                                    onClick={() => {
                                        handleAddAddressClick();
                                    }}
                                >
                                    add address field
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-1">
                        <label htmlFor="currency" className="form-label">Currency</label>
                        <div className="relative inline-flex w-full">
                            <svg className="w-2 h-2 absolute top-0 right-0 m-4 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 412 232"><path d="M206 171.144L42.678 7.822c-9.763-9.763-25.592-9.763-35.355 0-9.763 9.764-9.763 25.592 0 35.355l181 181c4.88 4.882 11.279 7.323 17.677 7.323s12.796-2.441 17.678-7.322l181-181c9.763-9.764 9.763-25.592 0-35.355-9.763-9.763-25.592-9.763-35.355 0L206 171.144z" fill="#648299" fillRule="nonzero" /></svg>
                            <select id="currency" className="bg-white rounded-sm h-10 pl-5 pr-10 w-full hover:border-gray-400 focus:outline-none appearance-none" value={selectedCurrency}
                                onChange={handleSelectedCurrencyChange}
                            >
                                <option value="-1">Don't lookup price data</option>
                                {currencyPairs.map(function ({ code, currency }) {
                                    return (
                                        <option key={code} value={code}>{`${code} - ${currency}`}</option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="px-4 py-1">
                        <label className="form-label">Date Range</label>
                        <div className="relative inline-flex w-full bg-white">
                            <div id="dateRange" className="rounded-sm h-10 pl-5 pr-10 w-full hover:border-gray-400 focus:outline-none appearance-none">
                                <div className="flex items-center h-full">
                                    {startDate && startDate.toLocaleDateString()} - {endDate && endDate.toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Calendar
                                onChange={onChange}
                                value={selectedDates}
                                minDate={new Date(2019, 0, 1)}
                                maxDate={new Date()}
                                minDetail="month"
                                selectRange={true}
                            />
                        </div>
                    </div>

                    <div className="px-4 py-1 mt-4">
                        <button className="w-full bg-blue-500 hover:bg-blue-700 text-white font-light py-2 px-4 rounded"
                            onClick={handleCalculateRewardsClick}
                        >
                            Calculate Rewards
                        </button>
                    </div>

                    {submitError && (
                        <div className="px-4 py-1 mt-4">
                            <p className="w-full text-red-500 font-light py-2 px-4">
                                {submitError}... please check the input fields and try again.
                            </p>
                        </div>
                    )}


                </div>

                <Footer />
            </div>
        </>
    );

}

export default HomePage;