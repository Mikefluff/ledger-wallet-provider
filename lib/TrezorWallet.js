'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _connect = require('../connect');

var _connect2 = _interopRequireDefault(_connect);

var _ethereumjsTx = require('ethereumjs-tx');

var _ethereumjsTx2 = _interopRequireDefault(_ethereumjsTx);

var _u2fApi = require('../u2f-api');

var _u2fApi2 = _interopRequireDefault(_u2fApi);

var _promiseTimeout = require('promise-timeout');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var stripHexPrefix = require('strip-hex-prefix');
var BigNumber = require('bignumber.js');
if (window.u2f === undefined) window.u2f = _u2fApi2.default;

var NOT_SUPPORTED_ERROR_MSG = "TrezorWallet uses U2F which is not supported by your browser. " + "Use Chrome, Opera or Firefox with a U2F extension." + "Also make sure you're on an HTTPS connection";
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
var path = "m/44'/60'/0'";

function stripAndPad(str) {
    if (str !== undefined) {
        var stripped = stripHexPrefix(str);
        return stripped.length % 2 === 0 ? stripped : '0' + stripped;
    }
    return null;
}

var TrezorWallet = function () {
    function TrezorWallet(pat, web3instance) {
        (0, _classCallCheck3.default)(this, TrezorWallet);

        this._path = path;
        this._accounts = null;
        this._web3 = web3instance || web3;
        this.isU2FSupported = null;
        this.getAccounts = this.getAccounts.bind(this);
        this.signTransaction = this.signTransaction.bind(this);
        this.connectionOpened = false;
    }

    (0, _createClass3.default)(TrezorWallet, [{
        key: 'init',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return TrezorWallet.isSupported();

                            case 2:
                                this.isU2FSupported = _context.sent;

                            case 3:
                            case 'end':
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
        key: 'getAccounts',


        /**
         * Gets a list of accounts from a device
         * @param {failableCallback} callback
         * @param askForOnDeviceConfirmation
         */
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(callback) {
                var askForOnDeviceConfirmation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
                var chainCode, cleanupCallback;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                console.log('get accounts called');

                                if (!(this._accounts !== null)) {
                                    _context2.next = 4;
                                    break;
                                }

                                callback(null, this._accounts);
                                return _context2.abrupt('return');

                            case 4:
                                chainCode = false; // Include the chain code

                                cleanupCallback = function cleanupCallback(error, data) {
                                    callback(error, data);
                                };

                                _connect2.default.TrezorConnect.ethereumGetAddress(this._path, function (response) {
                                    if (response.success) {
                                        // success
                                        this._accounts = ['0x' + response.address];
                                        cleanupCallback(null, ['0x' + response.address]);
                                        console.log('Address: ', response.address);
                                    } else {
                                        cleanupCallback(response.error);
                                        console.error('Error:', response.error); // error message
                                    }
                                }.bind(this));

                            case 7:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function getAccounts(_x) {
                return _ref2.apply(this, arguments);
            }

            return getAccounts;
        }()

        /**
         * Signs txData in a format that ethereumjs-tx accepts
         * @param {object} txData - transaction to sign
         * @param {failableCallback} callback - callback
         */

    }, {
        key: 'signTransaction',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(txData, callback) {
                var tx;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                // Encode using ethereumjs-tx
                                tx = new _ethereumjsTx2.default(txData);

                                // Fetch the chain id

                                this._web3.version.getNetwork(function () {
                                    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(error, chain_id) {
                                        var cleanupCallback;
                                        return _regenerator2.default.wrap(function _callee3$(_context3) {
                                            while (1) {
                                                switch (_context3.prev = _context3.next) {
                                                    case 0:
                                                        if (error) callback(error);

                                                        // Force chain_id to int
                                                        chain_id = 0 | chain_id;

                                                        cleanupCallback = function cleanupCallback(error, data) {
                                                            //this._closeLedgerConnection(eth);
                                                            callback(error, data);
                                                        };

                                                        console.log(txData);
                                                        console.log(stripAndPad(txData.nonce));
                                                        console.log(stripAndPad(txData.gasPrice));
                                                        console.log(stripAndPad(txData.gas));
                                                        console.log(stripAndPad(txData.value));
                                                        console.log(stripAndPad(txData.to));
                                                        _connect2.default.TrezorConnect.ethereumSignTx(this._path, stripAndPad(txData.nonce), stripAndPad(txData.gasPrice), stripAndPad(txData.gas), stripAndPad(txData.to), stripAndPad(txData.value), stripAndPad(txData.data), chain_id, function (response) {
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
                                                                var signed_chain_id = Math.floor((tx.v[0] - 35) / 2);
                                                                console.log(signed_chain_id);
                                                                if (signed_chain_id !== chain_id) {}
                                                                //cleanupCallback("Invalid signature received. Please update your Ledger Nano S.");


                                                                // Return the signed raw transaction
                                                                var rawTx = "0x" + tx.serialize().toString("hex");
                                                                console.log(rawTx);
                                                                cleanupCallback(undefined, rawTx);
                                                            } else {
                                                                console.error('Error:', response.error); // error message
                                                                cleanupCallback(response.error);
                                                            }
                                                        });

                                                    case 10:
                                                    case 'end':
                                                        return _context3.stop();
                                                }
                                            }
                                        }, _callee3, this);
                                    }));

                                    return function (_x5, _x6) {
                                        return _ref4.apply(this, arguments);
                                    };
                                }().bind(this));

                            case 2:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function signTransaction(_x3, _x4) {
                return _ref3.apply(this, arguments);
            }

            return signTransaction;
        }()
    }], [{
        key: 'isSupported',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                return _context5.abrupt('return', new _promise2.default(function (resolve, reject) {
                                    resolve(true);
                                }));

                            case 1:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function isSupported() {
                return _ref5.apply(this, arguments);
            }

            return isSupported;
        }()
    }]);
    return TrezorWallet;
}();

module.exports = TrezorWallet;