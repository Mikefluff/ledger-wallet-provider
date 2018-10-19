import EthereumTx from 'ethereumjs-tx';
import AppEth from "@ledgerhq/hw-app-eth";
import TransportU2F from "@ledgerhq/hw-transport-u2f";
import {timeout} from 'promise-timeout';
const addressToPathMap = {};
const getTransport = () => TransportU2F.create();
function obtainPathComponentsFromDerivationPath(derivationPath) {
  // check if derivation path follows 44'/60'/x'/n pattern
  const regExp = /^(44'\/6[0|1]'\/\d+'?\/)(\d+)$/;
  const matchResult = regExp.exec(derivationPath);
  if (matchResult === null) {
    throw makeError(
      "To get multiple accounts your derivation path must follow pattern 44'/60|61'/x'/n ",
      "InvalidDerivationPath"
    );
  }
  return { basePath: matchResult[1], index: parseInt(matchResult[2], 10) };
}
const NOT_SUPPORTED_ERROR_MSG =
    "LedgerWallet uses U2F which is not supported by your browser. " +
    "Use Chrome, Opera or Firefox with a U2F extension." +
    "Also make sure you're on an HTTPS connection";
/**
 *  @class LedgerWallet
 *
 *
 *  Paths:
 *  Minimum Nano Ledger S accepts are:
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
const allowed_hd_paths = ["44'/60'", "44'/61'"];

class LedgerWallet {

    constructor(path, web3instance) {
        this._path = path;
        this._web3 = web3instance || web3;
        this._accounts = null;
        this.isU2FSupported = null;
	this.getAppConfig = this.getAppConfig.bind(this);
        this.getAccounts = this.getAccounts.bind(this);
        this.signTransaction = this.signTransaction.bind(this);
        this.connectionOpened = false;
    }

    async init() {
        this.isU2FSupported = await LedgerWallet.isSupported();
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
     @typedef {function} failableCallback
     @param error
     @param result
     */

    /**
     * Gets the version of installed ethereum app
     * Check the isSupported() before calling that function
     * otherwise it never returns
     * @param {failableCallback} callback
     * @param ttl - timeout
     */
    async getAppConfig(callback, ttl) {
        if (!this.isU2FSupported) {
            callback(new Error(NOT_SUPPORTED_ERROR_MSG));
            return;
        }
	const transport = await getTransport();
        const eth = new AppEth(transport);
        let cleanupCallback = (error, data) => {
            callback(error, data);
        };
	//let config = await eth.getAppConfiguration()
	//console.log(config)
	transport.close()
	callback(null, true)
    }

    /**
     * Gets a list of accounts from a device
     * @param {failableCallback} callback
     * @param askForOnDeviceConfirmation
     */
    async getAccounts(callback, askForOnDeviceConfirmation = false) {
	let addresses = [];
	const pathComponents = obtainPathComponentsFromDerivationPath(this._path);
        if (!this.isU2FSupported) {
            callback(new Error(NOT_SUPPORTED_ERROR_MSG));
            return;
        }
        if (this._accounts !== null) {
            callback(null, this._accounts);
            return;
        }
        let cleanupCallback = (error, data) => {
            //this._closeLedgerConnection(eth);
            callback(error, data);
        };
	const transport = await getTransport()
        const eth = new AppEth(transport)
	const addr = await eth.getAddress("44'/60'/0'/0/0", false, false)
	addressToPathMap[addr.address.toLowerCase()] = "44'/60'/0'/0/0";
	addresses.push(addr.address)    
        for (var i = 0; i < 5; i++) {
            const path = pathComponents.basePath + (pathComponents.index + i).toString();
            console.log(path)
            const address = await eth.getAddress(path, false, false)
            addresses.push(address.address);
            addressToPathMap[address.address.toLowerCase()] = path;
	    console.log(addressToPathMap)
        }
	transport.close()
	callback(null, addresses);
    }
	
    /**
     * Signs txData in a format that ethereumjs-tx accepts
     * @param {object} txData - transaction to sign
     * @param {failableCallback} callback - callback
     */
    async signTransaction(txData, callback) {
	const path = addressToPathMap[txData.from.toLowerCase()];
        if (!path) throw new Error("address unknown '" + txData.from + "'");  
        if (!this.isU2FSupported) {
            callback(new Error(NOT_SUPPORTED_ERROR_MSG));
            return;
        }
        // Encode using ethereumjs-tx
        let tx = new EthereumTx(txData);

        // Fetch the chain id
        this._web3.version.getNetwork(async function (error, chain_id) {
	    
            if (error) callback(error);

            // Force chain_id to int
            chain_id = 0 | chain_id;

            // Set the EIP155 bits
            tx.raw[6] = Buffer.from([chain_id]); // v
            tx.raw[7] = Buffer.from([]);         // r
            tx.raw[8] = Buffer.from([]);         // s

            // Encode as hex-rlp for Ledger
            const hex = tx.serialize().toString("hex");

            let cleanupCallback = (error, data) => {
                callback(error, data);
            };
            // Pass to _ledger for signing
	    const transport = await getTransport();
            const eth = new AppEth(transport);
            eth.signTransaction(path, hex)
                .then(result => {
		    console.log(result)
                    // Store signature in transaction
                    tx.v = new Buffer(result.v, "hex");
                    tx.r = new Buffer(result.r, "hex");
                    tx.s = new Buffer(result.s, "hex");

                    // EIP155: v should be chain_id * 2 + {35, 36}
                    const signed_chain_id = Math.floor((tx.v[0] - 35) / 2);
                    if (signed_chain_id !== chain_id) {
                        cleanupCallback("Invalid signature received. Please update your Ledger Nano S.");
                    }

                    // Return the signed raw transaction
                    const rawTx = "0x" + tx.serialize().toString("hex");
                    transport.close();
                    cleanupCallback(undefined, rawTx);
                })
                .catch(error => cleanupCallback(error))
        }.bind(this))
    }
}

module.exports = LedgerWallet;
