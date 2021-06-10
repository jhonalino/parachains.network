import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { hexToU8a, isHex } from "@polkadot/util";
import { checkAddress } from "@polkadot/util-crypto";

//returns [success boolean, polkadot or kusama]
//or [error boolean, error message]
//e.g [true, "kusama"]
//e.g [true, "polkadot"]
//e.g [false, "not valid"]
const isValidKusamaOrPolkadotPublicAddress = (address) => {

    try {

        var ss58Encoded = encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));

        var polkadotPrefix = 0;
        var kusamaPrefix = 2;

        var [success, errorMsg] = checkAddress(address, kusamaPrefix)

        //its a kusama address
        if (success) {
            return [true, 'kusama']
        }

        //if not the check for polkadot
        var [success, errorMsg] = checkAddress(address, polkadotPrefix)

        if (success) {
            return [true, 'polkadot']
        }

        throw errorMsg;

    } catch (error) {

        return [false, error];

    }
};


export {
    isValidKusamaOrPolkadotPublicAddress
};