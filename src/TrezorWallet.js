import TrezorConnect from '../connect';
import EthereumTx from 'ethereumjs-tx';
import hdKey from 'ethereumjs-wallet/hdkey';
import u2f from '../u2f-api';
import {timeout} from 'promise-timeout';
const stripHexPrefix = require('strip-hex-prefix');
const BigNumber = require('bignumber.js');
if (window.u2f === undefined) window.u2f = u2f;

const NOT_SUPPORTED_ERROR_MSG =
    "TrezorWallet uses U2F which is not supported by your browser. " +
    "Use Chrome, Opera or Firefox with a U2F extension." +
    "Also make sure you're on an HTTPS connection";
/**
 *  @class TrezorWallet
 *
 *
 *  Paths:
 *  Minimum Trezor accepts are:
 *
 *   * 44'/60'
 *   * 44'/61'
 *
 *  MyEtherWallet.com by default uses the range
 *
 *   * 44'/60'/0'/n
 *
 *  Note: no hardend derivation on the `n`
 *
 *  BIP44/EIP84 specificies:
 *
 *  * m / purpose' / coin_type' / account' / change / address_index
 *
 *  @see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 *  @see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 *  @see https://github.com/MetaMask/provider-engine
 *  @see https://github.com/ethereum/wiki/wiki/JavaScript-API
 *
 *  Implementations:
 *  https://github.com/MetaMask/metamask-plugin/blob/master/app/scripts/keyrings/hd.js
 *
 */
var path = "m/44'/60'/0'/0";

function stripAndPad (str) {
    if(str !== undefined) {
        const stripped = stripHexPrefix(str)
        return stripped.length % 2 === 0 ? stripped : '0' + stripped
    }
    return null
}

class TrezorWallet {

    constructor(pat, web3instance) {
        this._path = path;
        this._accounts = null;
	this._web3 = web3instance || web3;
        this.isU2FSupported = null;
        this.getAccounts = this.getAccounts.bind(this);
        this.signTransaction = this.signTransaction.bind(this);
        this.connectionOpened = false;
    }

    async init() {
        this.isU2FSupported = await TrezorWallet.isSupported();
    }

    /**
     * Checks if the browser supports u2f.
     * Currently there is no good way to do feature-detection,
     * so we call getApiVersion and wait for 100ms
     */
    static async isSupported() {
        return new Promise((resolve, reject) => {
                resolve(true);
        });
    };

    /**
     * Gets a list of accounts from a device
     * @param {failableCallback} callback
     * @param askForOnDeviceConfirmation
     */
    async getAccounts(callback, askForOnDeviceConfirmation = false) {
	console.log('get accounts called')
        let addresses = [];
        if (this._accounts !== null) {
            callback(null, this._accounts);
            return;
        }
        const chainCode = false; // Include the chain code
	let cleanupCallback = (error, data) => {
            callback(error, data);
        };
        TrezorConnect.TrezorConnect.getXPubKey(this._path, function (response) {
        if (response.success) { // success
	    console.log('XPUB:', response.xpubkey); // serialized XPUB
	    const hdWallet = hdKey.fromExtendedKey(response.xpubkey)
	    for (var i = 0; i < 5; i++) {
	        const address = hdWallet.deriveChild(i).getWallet().getAddressString()
                addresses.push(address)
	    }
            cleanupCallback(null, addresses);
            console.log('Addresses: ', addresses);
        } else {
            cleanupCallback(response.error)
            console.error('Error:', response.error); // error message
        }
        }.bind(this));	
    }

    /**
     * Signs txData in a format that ethereumjs-tx accepts
     * @param {object} txData - transaction to sign
     * @param {failableCallback} callback - callback
     */
    async signTransaction(txData, callback) {
        // Encode using ethereumjs-tx
        let tx = new EthereumTx(txData);

        // Fetch the chain id
        this._web3.version.getNetwork(async function (error, chain_id) {
            if (error) callback(error);

            // Force chain_id to int
            chain_id = 0 | chain_id;
        let cleanupCallback = (error, data) => {
            //this._closeLedgerConnection(eth);
            callback(error, data);
        };
        console.log(txData);
	console.log(stripAndPad(txData.nonce));	
        console.log(stripAndPad(txData.gasPrice));
        console.log(stripAndPad(txData.gas));
        console.log(stripAndPad(txData.value));
        console.log(stripAndPad(txData.to));
         TrezorConnect.TrezorConnect.ethereumSignTx(
            this._path,
            stripAndPad(txData.nonce),
            stripAndPad(txData.gasPrice),
            stripAndPad(txData.gas),
            stripAndPad(txData.to),
            stripAndPad(txData.value),
            stripAndPad(txData.data),
            chain_id,
            function (response) {
             console.log(response);
             if (response.success) {
                 console.log('Signature V (recovery parameter):', new BigNumber(response.v).toString(16)); // number
                 console.log('Signature R component:', response.r); // bytes
                 console.log('Signature S component:', response.s); // bytes
                    // Store signature in transaction
                    tx.v = '0x' + new BigNumber(response.v).toString(16);
                    tx.r = '0x' + response.r;
                    tx.s = '0x' + response.s;

                    // EIP155: v should be chain_id * 2 + {35, 36}
                    const signed_chain_id = Math.floor((tx.v[0] - 35) / 2);
		    console.log(signed_chain_id);
                    if (signed_chain_id !== chain_id) {
                        //cleanupCallback("Invalid signature received. Please update your Ledger Nano S.");
                    }

                    // Return the signed raw transaction
                    const rawTx = "0x" + tx.serialize().toString("hex");
		    console.log(rawTx);
                    cleanupCallback(undefined, rawTx);
             } else {
                 console.error('Error:', response.error); // error message
                 cleanupCallback(response.error)
             }
         });
    }.bind(this));
    }
}

module.exports = TrezorWallet;
