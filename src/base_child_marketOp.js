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

    _strategy() {
        let baseOp = this._baseOp;
        let terminal = this._baseOp.terminal;
        if (terminal == undefined) return;
        for (let resourceName in terminal.store) {
            let resourceType = /**@type {ResourceConstant} */ (resourceName);
            if (resourceType == RESOURCE_ENERGY) continue;
            let amount = terminal.store[resourceType];
            let market = Game.market;
            let orders = market.getAllOrders({type:ORDER_BUY, resourceType: resourceType});
            //sort high to low price
            orders = orders.sort((a,b) => {
                return b.price - a.price;
                return 0;
            })
            for (let order of orders) {
                if (amount <= 0) break;
                let dealAmount = Math.min(order.amount, amount, c.MAX_TRANSACTION);
                let res = market.deal(order.id, dealAmount, this._baseOp.name)
                if (res == OK) amount -= dealAmount;
                else break;
             }
        }
    }

    _tactics() {
    }    

    _command(){
    }
}