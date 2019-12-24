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

    /**
     * @param {String} baseName
     */
    getCredits(baseName) {
        return Memory.bank[baseName]||0;
    }

    // reallocate unallocated credits
    _support() {
        let allocatedCredits = 0;
        for (let baseName in Memory.bank) {
            let room = Game.rooms[baseName];
            if (room.controller && room.controller.my) {
                allocatedCredits += Memory.bank[baseName];
            } else {
                delete Memory.bank[baseName];
            }
        }
        let unallocatedCredits = Game.market.credits - allocatedCredits;
        let giftSize = unallocatedCredits / _.size(Memory.bank);
        for (let baseName in Memory.bank) {
            Memory.bank[baseName] += giftSize;
        }
    }

    // allocate transaction credits.
    _command() {
        for (let transaction of Game.market.outgoingTransactions) {
            if (transaction.time != Game.time - 1) break;
            let senderName = transaction.from;
            if (transaction.order) {
                let totalPrice = transaction.amount * transaction.order.price;
                this._allocateCredits(transaction.from, totalPrice)
            }
        }
        for (let transaction of Game.market.incomingTransactions) {
            if (transaction.time != Game.time - 1) break;
            let receiverName = transaction.to;
            if (transaction.order) {
                let totalPrice = -1 * transaction.amount * transaction.order.price;
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
