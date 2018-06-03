"use strict";

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

var _ethereumjsTx = require("ethereumjs-tx");

var _ethereumjsTx2 = _interopRequireDefault(_ethereumjsTx);

var _hwAppEth = require("@ledgerhq/hw-app-eth");

var _hwAppEth2 = _interopRequireDefault(_hwAppEth);

var _hwTransportU2f = require("@ledgerhq/hw-transport-u2f");

var _hwTransportU2f2 = _interopRequireDefault(_hwTransportU2f);

var _promiseTimeout = require("promise-timeout");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var addressToPathMap = {};
var getTransport = function getTransport() {
    return _hwTransportU2f2.default.create();
};
function obtainPathComponentsFromDerivationPath(derivationPath) {
    // check if derivation path follows 44'/60'/x'/n pattern
    var regExp = /^(44'\/6[0|1]'\/\d+'?\/)(\d+)$/;
    var matchResult = regExp.exec(derivationPath);
    if (matchResult === null) {
        throw makeError("To get multiple accounts your derivation path must follow pattern 44'/60|61'/x'/n ", "InvalidDerivationPath");
    }
    return { basePath: matchResult[1], index: parseInt(matchResult[2], 10) };
}
var NOT_SUPPORTED_ERROR_MSG = "LedgerWallet uses U2F which is not supported by your browser. " + "Use Chrome, Opera or Firefox with a U2F extension." + "Also make sure you're on an HTTPS connection";
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
var allowed_hd_paths = ["44'/60'", "44'/61'"];

var LedgerWallet = function () {
    function LedgerWallet(path, web3instance) {
        (0, _classCallCheck3.default)(this, LedgerWallet);

        this._path = path;
        this._web3 = web3instance || web3;
        this._accounts = null;
        this.isU2FSupported = null;
        this.getAppConfig = this.getAppConfig.bind(this);
        this.getAccounts = this.getAccounts.bind(this);
        this.signTransaction = this.signTransaction.bind(this);
        this.connectionOpened = false;
    }

    (0, _createClass3.default)(LedgerWallet, [{
        key: "init",
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return LedgerWallet.isSupported();

                            case 2:
                                this.isU2FSupported = _context.sent;

                            case 3:
                            case "end":
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function init() {
                return _ref.apply(this, arguments);
            }

            return init;
        }()

        /**
         * Checks if the browser supports u2f.
         * Currently there is no good way to do feature-detection,
         * so we call getApiVersion and wait for 100ms
         */

    }, {
        key: "getAppConfig",


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
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(callback, ttl) {
                var transport, eth, cleanupCallback;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (this.isU2FSupported) {
                                    _context2.next = 3;
                                    break;
                                }

                                callback(new Error(NOT_SUPPORTED_ERROR_MSG));
                                return _context2.abrupt("return");

                            case 3:
                                _context2.next = 5;
                                return getTransport();

                            case 5:
                                transport = _context2.sent;
                                eth = new _hwAppEth2.default(transport);

                                cleanupCallback = function cleanupCallback(error, data) {
                                    callback(error, data);
                                };
                                //let config = await eth.getAppConfiguration()
                                //console.log(config)


                                transport.close();
                                callback(null, true);

                            case 10:
                            case "end":
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function getAppConfig(_x, _x2) {
                return _ref2.apply(this, arguments);
            }

            return getAppConfig;
        }()

        /**
         * Gets a list of accounts from a device
         * @param {failableCallback} callback
         * @param askForOnDeviceConfirmation
         */

    }, {
        key: "getAccounts",
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(callback) {
                var askForOnDeviceConfirmation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
                var addresses, pathComponents, cleanupCallback, transport, eth, i, path, address;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                addresses = [];
                                pathComponents = obtainPathComponentsFromDerivationPath(this._path);

                                if (this.isU2FSupported) {
                                    _context3.next = 5;
                                    break;
                                }

                                callback(new Error(NOT_SUPPORTED_ERROR_MSG));
                                return _context3.abrupt("return");

                            case 5:
                                if (!(this._accounts !== null)) {
                                    _context3.next = 8;
                                    break;
                                }

                                callback(null, this._accounts);
                                return _context3.abrupt("return");

                            case 8:
                                cleanupCallback = function cleanupCallback(error, data) {
                                    //this._closeLedgerConnection(eth);
                                    callback(error, data);
                                };

                                _context3.next = 11;
                                return getTransport();

                            case 11:
                                transport = _context3.sent;
                                eth = new _hwAppEth2.default(transport);
                                i = 0;

                            case 14:
                                if (!(i < 5)) {
                                    _context3.next = 25;
                                    break;
                                }

                                path = pathComponents.basePath + (pathComponents.index + i).toString();

                                console.log(path);
                                _context3.next = 19;
                                return eth.getAddress(path, false, false);

                            case 19:
                                address = _context3.sent;

                                addresses.push(address.address);
                                addressToPathMap[address.address.toLowerCase()] = path;

                            case 22:
                                i++;
                                _context3.next = 14;
                                break;

                            case 25:
                                transport.close();
                                callback(null, addresses);

                            case 27:
                            case "end":
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function getAccounts(_x3) {
                return _ref3.apply(this, arguments);
            }

            return getAccounts;
        }()

        /**
         * Signs txData in a format that ethereumjs-tx accepts
         * @param {object} txData - transaction to sign
         * @param {failableCallback} callback - callback
         */

    }, {
        key: "signTransaction",
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(txData, callback) {
                var tx;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                if (this.isU2FSupported) {
                                    _context5.next = 3;
                                    break;
                                }

                                callback(new Error(NOT_SUPPORTED_ERROR_MSG));
                                return _context5.abrupt("return");

                            case 3:
                                // Encode using ethereumjs-tx
                                tx = new _ethereumjsTx2.default(txData);

                                // Fetch the chain id

                                this._web3.version.getNetwork(function () {
                                    var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(error, chain_id) {
                                        var hex, cleanupCallback, transport, eth;
                                        return _regenerator2.default.wrap(function _callee4$(_context4) {
                                            while (1) {
                                                switch (_context4.prev = _context4.next) {
                                                    case 0:
                                                        if (error) callback(error);

                                                        // Force chain_id to int
                                                        chain_id = 0 | chain_id;

                                                        // Set the EIP155 bits
                                                        tx.raw[6] = Buffer.from([chain_id]); // v
                                                        tx.raw[7] = Buffer.from([]); // r
                                                        tx.raw[8] = Buffer.from([]); // s

                                                        // Encode as hex-rlp for Ledger
                                                        hex = tx.serialize().toString("hex");

                                                        cleanupCallback = function cleanupCallback(error, data) {
                                                            callback(error, data);
                                                        };
                                                        // Pass to _ledger for signing


                                                        _context4.next = 9;
                                                        return getTransport();

                                                    case 9:
                                                        transport = _context4.sent;
                                                        eth = new _hwAppEth2.default(transport);

                                                        eth.signTransaction(this._path, hex).then(function (result) {
                                                            // Store signature in transaction
                                                            tx.v = new Buffer(result.v, "hex");
                                                            tx.r = new Buffer(result.r, "hex");
                                                            tx.s = new Buffer(result.s, "hex");

                                                            // EIP155: v should be chain_id * 2 + {35, 36}
                                                            var signed_chain_id = Math.floor((tx.v[0] - 35) / 2);
                                                            if (signed_chain_id !== chain_id) {
                                                                cleanupCallback("Invalid signature received. Please update your Ledger Nano S.");
                                                            }

                                                            // Return the signed raw transaction
                                                            var rawTx = "0x" + tx.serialize().toString("hex");
                                                            transport.close();
                                                            cleanupCallback(undefined, rawTx);
                                                        }).catch(function (error) {
                                                            return cleanupCallback(error);
                                                        });

                                                    case 12:
                                                    case "end":
                                                        return _context4.stop();
                                                }
                                            }
                                        }, _callee4, this);
                                    }));

                                    return function (_x7, _x8) {
                                        return _ref5.apply(this, arguments);
                                    };
                                }().bind(this));

                            case 5:
                            case "end":
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function signTransaction(_x5, _x6) {
                return _ref4.apply(this, arguments);
            }

            return signTransaction;
        }()
    }], [{
        key: "isSupported",
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6() {
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                return _context6.abrupt("return", new _promise2.default(function (resolve, reject) {
                                    resolve(true);
                                }));

                            case 1:
                            case "end":
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function isSupported() {
                return _ref6.apply(this, arguments);
            }

            return isSupported;
        }()
    }]);
    return LedgerWallet;
}();

module.exports = LedgerWallet;