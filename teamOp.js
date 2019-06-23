let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
let CreepOp = require('./creepOp');
let SpawningOp = require('./spawningOp');
/**@typedef {import('./baseOp')} BaseOp  */

module.exports = class CreepTeamOp extends Operation {
    /**@param {BaseOp} baseOp */
    /**@param {SpawningOp} spawningOp*/
    constructor(baseOp, spawningOp) {
        super();
        this._baseOp = baseOp;
        this._spawningOp = spawningOp;
        /**@type {{[creepName:string]:CreepOp}} */
        this._creepOps = {}
    }

    /**@param {Creep[]} creeps */
    initTick(creeps) {
        /**@type {{[creepName:string]:CreepOp}} */
        let newCreepOps = {};
        if (creeps) {
            for(let creep of creeps) {
                if (!this._creepOps[creep.name]) this._creepOps[creep.name] = new CreepOp(creep, this._baseOp);
                else this._creepOps[creep.name].initTick(creep);
                newCreepOps[creep.name] = this._creepOps[creep.name];
            }
        } 
        this._creepOps = newCreepOps;
    }

    getCreepCount(){
        let res = _.size(this._creepOps)
        if (!res) res = 0;
        return res;
    }

    _command() {
        for (let creepName in this._creepOps) {
            if (U.getCreep(creepName)) this._creepOps[creepName].run();
        }
    }
}
