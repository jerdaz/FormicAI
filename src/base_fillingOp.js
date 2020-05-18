const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');


module.exports = class FillingOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        this._lastTickFull = 0;
    }
    get type() {return c.OPERATION_FILLING}

    _firstRun() {
        this._strategy();
    }
    
    _strategy() {
        let template = {body:[MOVE,CARRY,WORK]}
        let creepCount = 10;
        if (this.baseOp.storage) creepCount = 2;
        if (this.baseOp.phase >= c.BASE_PHASE_STORED_ENERGY ) creepCount = 1;
        if (this.baseOp.phase >= c.BASE_PHASE_STORED_ENERGY) template = {body:[MOVE,CARRY]}
        this._baseOp.spawningOp.ltRequestSpawn(this, template, creepCount)
    }

    // _tactics() {
    //     for (let creepName in this._creepOps) {
    //         let creepOp = this._creepOps[creepName];
    //     }
    // }

    _tactics() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            U.l(creepOp.name)
            U.l(creepOp.instruction)
            U.l(creepOp.idleTime)
            if (creepOp.instruction == c.COMMAND_NONE) {
                if (creepOp.idleTime >= c.TACTICS_INTERVAL && this.creepCount > 2 && creepOp.state != c.STATE_FINDENERGY) {
                    if (this._lastTickFull = Game.time - 1) creepOp.newParent(this._baseOp.buildingOp)
                    this._lastTickFull = Game.time;
                }
                else creepOp.instructFill();
            }
        }
    }
}

