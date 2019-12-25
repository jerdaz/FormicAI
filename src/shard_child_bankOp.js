const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shard_shardChildOp');

const VERBOSE = true;

//credits to keep as a reserve
const RESERVE_CREDITS = 1000;

module.exports = class ColonizingOp extends ShardChildOp {
    /**
     * @param {ShardOp}  shardOp
     * @param {Operation}  parent
     * */
    constructor(parent, shardOp) {
        super(parent, shardOp);
    }
    
    get type() {return c.OPERATION_BANK}

    /**
     * @param {String} baseName
     */
    getCredits(baseName) {
        return /**@type {Number} */ (Memory.bank[baseName]||0);
    }


    // allocate transaction credits.
    _command() {
        if (VERBOSE) U.l('== BEGIN MARKET OPERATION COMMAND PROCESS ==')
        for (let transaction of Game.market.outgoingTransactions) {
            if (transaction.time != Game.time - 1) break;
            if (VERBOSE) U.l('Processing outgoing transaction:')
            if (VERBOSE) U.l(transaction)
            let senderName = transaction.from;
            if (transaction.order) {
                let totalPrice = transaction.amount * transaction.order.price;
                this._allocateCredits(transaction.from, totalPrice)
            }
        }
        for (let transaction of Game.market.incomingTransactions) {
            if (transaction.time != Game.time - 1) break;
            if (VERBOSE) U.l('Processing incoming transaction:')
            if (VERBOSE) U.l(transaction)
            let receiverName = transaction.to;
            if (transaction.order) {
                let totalPrice = -1 * transaction.amount * transaction.order.price;
                this._allocateCredits(receiverName, totalPrice)
            }
        }
        if (VERBOSE) U.l('== END MARKET OPERATION COMMAND PROCESS ==')
    }

    /**
     * @param {string} baseName
     * @param {number} amount
     */
    _allocateCredits(baseName, amount) {
        if (Game.market.credits < RESERVE_CREDITS) return;
        if (Memory.bank[baseName] == undefined) Memory.bank[baseName] = 0;
        let newBalance = Math.round(Memory.bank[baseName] + amount * 1000) / 1000;
        if (VERBOSE) U.l({Task: 'Allocating credits', baseName: baseName, oldCredits: Memory.bank[baseName], amount: amount, newBalance: newBalance})
        Memory.bank[baseName] = newBalance;
    }
}
