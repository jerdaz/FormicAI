let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
let CreepOp = require('./creepOp');
/**@typedef {import('./baseOp')} BaseOp  */

module.exports = class CreepTeamOp extends Operation {
    /**@param {Creep[]} creeps */
    /**@param {BaseOp} baseOp */
    constructor(creeps, baseOp) {
        super();
        this._baseOp = baseOp;
        /**@type {{[creepName:string]:CreepOp}} */
        this._creepOps = {}
        this.initTick(creeps);
    }

    /**@param {Creep[]} creeps */
    initTick(creeps) {
        for(let creep of creeps) {
            if (!this._creepOps[creep.name]) this._creepOps[creep.name] = new CreepOp(creep);
            else this._creepOps[creep.name].initTick(creep);
        }
    }

    _command() {
        for (let creepName in this._creepOps) {
            if (U.getCreep(creepName)) this._creepOps[creepName].run();
            else delete this._creepOps[creepName];
        }
    }
}
