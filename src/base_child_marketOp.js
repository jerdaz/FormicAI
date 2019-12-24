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
            let amount = terminal.store[resourceType];
            let market = Game.market;
            
        }
    }

    _tactics() {
    }    

    _command(){
    }
}