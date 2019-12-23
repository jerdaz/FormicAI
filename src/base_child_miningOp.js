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
        let mineral = /**@type {Mineral} */( Game.getObjectById(this._mineralId));
        let extractor = _.filter(mineral.pos.lookFor(LOOK_STRUCTURES),o => o.structureType == STRUCTURE_EXTRACTOR);
        if (!mineral) throw Error('Source not found')

        if (this.baseOp.terminal && extractor) {
             this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 1)
        }
        else if (this.baseOp.terminal) {
            mineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
        }
    }

    _tactics() {
        let terminal = this.baseOp.terminal
        if (!terminal) return;

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let mineral = /**@type {Mineral} */( Game.getObjectById(this._mineralId));
            let extractor = _.filter(mineral.pos.lookFor(LOOK_STRUCTURES),o => o.structureType == STRUCTURE_EXTRACTOR);
            if (extractor) creepOp.instructTransfer(extractor, terminal);
        }
    }
}
