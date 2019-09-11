const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseChildOp');

module.exports = class HarvestingOp extends BaseChildOp {
    /** 
     * @param {BaseOp} baseOp
     * @param {String} sourceId */
    constructor (baseOp, sourceId) {
        super(baseOp);
        this._sourceId = sourceId;
    }

    get type() {return c.OPERATION_HARVESTING}

    _strategy() {
        if (this.baseOp.phase == c.BASE_PHASE_BIRTH) {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 0)
        } else {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK], minLength:3, maxLength:10*3}, 1)
        }
    }
}
