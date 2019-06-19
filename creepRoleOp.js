let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
let CreepOp = require('./creepOp');
/**@typedef {import('./baseOp')} BaseOp  */

module.exports = class CreepRoleOp extends Operation {
    /**@param {Creep} creep */
    /**@param {BaseOp} baseOp */
    constructor(creep, baseOp) {
        super();
        this._baseOp = baseOp;
        this._creepOp = new CreepOp(creep);
    }

    /**@param {Creep} creep */
    initTick(creep) {
        this._creepOp.initTick(creep);
    }

    getRole() {
        return parseInt(this._creepOp.getName().split('_')[1]);
    }

    _command() {
        this._creepOp.run();
    }
}