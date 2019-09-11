const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseChildOp');

module.exports = class HarvestingOp extends BaseChildOp {
    /** 
     * @param {BaseOp} baseOp
     * @param {String} sourceId 
     * @param {number} instance*/
    constructor (baseOp, sourceId, instance) {
        super(baseOp, instance);
        this._sourceId = sourceId;
    }

    get type() {return c.OPERATION_HARVESTING}

    _strategy() {
        if (this.baseOp.phase < c.BASE_PHASE_HARVESTER) {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 0)
        } else {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK], minLength:3, maxLength:10*3}, 1)
            for (let creepName in this._creepOps) {
                let creepOp = this._creepOps[creepName];
                let source = Game.getObjectById(this._sourceId);
                creepOp.instructTransfer(source, this.baseOp.storage)
            }
        }
    }
}
