const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shard_shardChildOp');

//credits to keep as a reserve
const RESERVE_CREDITS = 0;

module.exports = class BankOp extends ShardChildOp {
    /**
     * @param {ShardOp}  shardOp
     * @param {Operation}  parent
     * */
    constructor(parent, shardOp) {
        super(parent, shardOp);
        this._verbose = false;
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
        for (let transaction of Game.market.outgoingTransactions) {
            if (transaction.time != Game.time - 1) break;
            this._log('Processing outgoing transaction:')
            this._log(transaction)
            let senderName = transaction.from;
            if (transaction.order) {
                let totalPrice = transaction.amount * transaction.order.price;
                this._allocateCredits(transaction.from, totalPrice)
            }
        }
        for (let transaction of Game.market.incomingTransactions) {
            if (transaction.time != Game.time - 1) break;
            this._log('Processing incoming transaction:')
            this._log(transaction)
            let receiverName = transaction.to;
            if (transaction.order) {
                let totalPrice = -1 * transaction.amount * transaction.order.price;
                this._allocateCredits(receiverName, totalPrice)
            }
        }
    }

    /**
     * @param {string} baseName
     * @param {number} amount
     */
    _allocateCredits(baseName, amount) {
        if (Game.market.credits < RESERVE_CREDITS) return;
        if (Memory.bank[baseName] == undefined) Memory.bank[baseName] = 0;
        let newBalance = Math.round((Memory.bank[baseName] + amount) * 1000) / 1000;
        this._log({Task: 'Allocating credits', baseName: baseName, oldCredits: Memory.bank[baseName], amount: amount, newBalance: newBalance})
        Memory.bank[baseName] = newBalance;
    }
}
