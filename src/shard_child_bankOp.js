const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shard_shardChildOp');

module.exports = class ColonizingOp extends ShardChildOp {
    /**
     * @param {ShardOp}  shardOp
     * @param {Operation}  parent
     * */
    constructor(parent, shardOp) {
        super(parent, shardOp);
    }
    
    get type() {return c.OPERATION_BANK}

    _command() {
        for (let transaction of Game.market.incomingTransactions) {
            if (transaction.time != Game.time - 1) break;
            let senderName = transaction.from;
            if (transaction.order && transaction.order.type == ORDER_SELL) {
                let totalPrice = transaction.amount * transaction.order.price;
                this._allocateCredits(transaction.from, totalPrice)
            }
        }
    }

    /**
     * @param {string} baseName
     * @param {number} amount
     */
    _allocateCredits(baseName, amount) {
        if (Memory.bank[baseName] == undefined) Memory.bank[baseName] = 0;
        Memory.bank[baseName] += amount;
    }
}
