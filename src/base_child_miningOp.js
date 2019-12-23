const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_baseChildOp');

const HARVESTER_SIZE_BIG = 48
const HARVESTER_SIZE_SMALL = 6*3

module.exports = class MiningOp extends BaseChildOp {
    /** 
     * @param {BaseOp} baseOp
     */
    constructor (baseOp) {
        super(baseOp);
        let mineral = baseOp.base.find(FIND_MINERALS)[0];
        this._mineralId = mineral.id;
    }

    get type() {return c.OPERATION_MINING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        /**@type {Source | null} */
        let mineral = Game.getObjectById(this._mineralId);
        if (!mineral) throw Error('Source not found')

        if (this.baseOp.terminal) {
             this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 1)
        }
    }

    _tactics() {
        let terminal = this.baseOp.terminal
        if (!terminal) return;

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let mineral = Game.getObjectById(this._mineralId);
            creepOp.instructTransfer(mineral, terminal);
        }
    }
}
