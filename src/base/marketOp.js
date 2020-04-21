const U = require('../util');
const c = require('../constants');
const BaseChildOp = require('./meta_baseChildOp');

const MIN_MARKET_CREDITS = 10;
const MIN_STOCK_PILE_SIZE = Math.floor(MAX_CREEP_SIZE / 3) * CARRY_CAPACITY * 2 //this is equal to 1 full transporter creep;
/**@type {{[index:string]:number}} */
let TERMINAL_MAX_STORAGE = {
    energy : 100000,
    XGH2O : 10000
}

/** STOCKPILE logic
 * > Maxamount: send 50% of maxamount to other room
 * > Maxamount: actively sell (50% max)
 * < 50% maxamount: try to buy from market (50% max)
 * < 25% maxamount: receive   from other room
 * 
 */


module.exports = class MarketOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {{[index:string]:number}} */
        this._resourcePrice = {};
        this._verbose = false;
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
        if (terminal == null || terminal.cooldown > 0) return;
        let market = Game.market;

        //first try to send resources to own terminals
        // this will spread resources through the empire
        for (let resourceName in terminal.store) {
            let resourceType = /**@type {ResourceConstant} */ (resourceName);
            let amount = terminal.store[resourceType];
            let maxAmount = TERMINAL_MAX_STORAGE[resourceType];
            if (amount > maxAmount) {
                this._log({trying_to_send_from:terminal.pos.roomName})
                let terminals = _.filter(Game.structures, o => {
                        if (o.structureType == STRUCTURE_TERMINAL) {
                            let terminal = /**@type {StructureTerminal} */ (o);
                            if (terminal.store[resourceType] < maxAmount / 4) return true;
                        }
                        return false;
                    });
                if (terminals.length > 0) {
                    terminals.sort((a,b) => {return Game.map.getRoomLinearDistance(this._baseOp.name, a.pos.roomName)
                                                - Game.map.getRoomLinearDistance(this._baseOp.name, b.pos.roomName)
                                                })
                    let terminalTo = terminals[0];
                    let sendAmount = Math.min(amount - maxAmount/2, maxAmount/2)
                    this._log({sending_to: terminalTo.pos.roomName, amount: sendAmount, type: resourceType})
                    let result = terminal.send(resourceType, sendAmount, terminalTo.pos.roomName);
                    this._log({result: result})
                    if (result == OK) return;
                }
            }
        }        

        // sell minerals
        let energyPrice = this._resourcePrice[RESOURCE_ENERGY] || market.getHistory(RESOURCE_ENERGY)[0].avgPrice || 0;
        for (let resourceName in terminal.store) {
            let resourceType = /**@type {ResourceConstant} */ (resourceName);
            if (resourceType == RESOURCE_ENERGY) continue;
            let amount = terminal.store[resourceType];
            if (amount< TERMINAL_MAX_STORAGE[resourceType] || 0) continue 
            //this._log({base: baseOp.name, Trying_to_sell: resourceType, amount:amount, energyPrice: this._energyPrice})
            /**@type {OrderEx[]} */
            let orders = market.getAllOrders({type:ORDER_BUY, resourceType: resourceType});
            //calculate net price
            for (let order of orders) {
                order.transactionCost = energyPrice * market.calcTransactionCost(1,order.roomName||this._baseOp.name, this._baseOp.name);
                order.netPrice = order.price - order.transactionCost;
            }
            //sort high to low price
            orders = orders.sort((a,b) => {
                return (b.netPrice||b.price) - (a.netPrice||a.price);
            })
            this._log('Sorted Orders:');
            this._log(orders);
            let order = orders[0]
            if (order) {
                if (amount <= 0) break;
                let dealAmount = Math.min(order.amount, amount, c.MAX_TRANSACTION);
                this._log({deal: order, amount:amount})
                let res = market.deal(order.id, dealAmount, this._baseOp.name)
                this._log({result: res});
                if (res == OK) return; // succesful deal stop;
             }
        }

        // buy resources
        let credits = this._baseOp.credits;
        if (credits > MIN_MARKET_CREDITS) {
            for (let buyType in TERMINAL_MAX_STORAGE) {
                let resourceType = /**@type {ResourceConstant} */ (buyType)
                if (terminal.store[resourceType]> TERMINAL_MAX_STORAGE[resourceType]/2) continue;
                this._log({base: baseOp.name, Trying_to_buy: resourceType, resourcePrices: this._resourcePrice})
                /**@type {OrderEx[]} */
                let orders = market.getAllOrders({type:ORDER_SELL, resourceType:  resourceType})
                //calculate net price
                for (let order of orders) {
                    order.transactionCost = market.calcTransactionCost(1000,order.roomName||this._baseOp.name, this._baseOp.name)/1000;
                    // if energy, calculate effective price including transport.
                    if (resourceType == RESOURCE_ENERGY) order.netPrice = order.price * 1/(1-order.transactionCost);
                    // if other resource, calculate based on energy price
                    else order.netPrice = order.price + order.transactionCost * (this._resourcePrice[RESOURCE_ENERGY]||0);
                }
                //sort low to high
                orders = orders.sort((a,b) => {
                    return (a.netPrice||a.price) - (b.netPrice||b.price);
                });
                this._log('Sorted Orders:');
                this._log(orders);
                let order = orders[0];
                if (order) {
                    let dealAmount = Math.min(order.amount, credits / order.price, c.MAX_TRANSACTION)
                    this._log({deal: order, amount:dealAmount})
                    let res = market.deal(order.id, dealAmount, this._baseOp.name);
                    if (res == OK) {
                        //calculate and save current local price
                        this._resourcePrice[resourceType] = orders[0].price / (1-market.calcTransactionCost(1000,orders[0].roomName||this._baseOp.name, this._baseOp.name)/1000);
                        return;
                    }
                }
            }
        }
    }
}