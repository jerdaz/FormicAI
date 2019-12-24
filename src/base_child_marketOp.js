const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_baseChildOp');

module.exports = class MarketOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
    }

    get type() {return c.OPERATION_MARKET}

    initTick() {
        super.initTick();
    }

    _firstRun() {
    }

    _tactics() {
        let baseOp = this._baseOp;
        let terminal = this._baseOp.terminal;
        if (terminal == undefined) return;
        let market = Game.market;

        // sell minerals
        for (let resourceName in terminal.store) {
            let resourceType = /**@type {ResourceConstant} */ (resourceName);
            if (resourceType == RESOURCE_ENERGY) continue;
            let amount = terminal.store[resourceType];
            let orders = market.getAllOrders({type:ORDER_BUY, resourceType: resourceType});
            //sort high to low price
            orders = orders.sort((a,b) => {
                return b.price - a.price;
            })
            for (let order of orders) {
                if (amount <= 0) break;
                let dealAmount = Math.min(order.amount, amount, c.MAX_TRANSACTION);
                let res = market.deal(order.id, dealAmount, this._baseOp.name)
                if (res == OK) amount -= dealAmount;
                else break;
             }
        }

        // buy energy
        let credits = this._baseOp.credits;
        if (credits > 0) {
            let orders = market.getAllOrders({type:ORDER_SELL, resourceType: RESOURCE_ENERGY})
            //sort low to high
            orders = orders.sort((a,b) => {
                return a.price - b.price;
            });
            for (let order of orders) {
                if (credits <= 0) break;
                let dealAmount = Math.min(order.amount, credits / order.price, c.MAX_TRANSACTION)
                let res = market.deal(order.id, dealAmount, this._baseOp.name);
                if (res == OK) credits -= dealAmount * order.price;
            }
        }
    }
}