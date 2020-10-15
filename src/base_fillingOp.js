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
        let template = {body:[MOVE,WORK,CARRY], maxLength: 4*3}
        let creepCount = 10;
        if (this.baseOp.phase >= c.BASE_PHASE_HARVESTER ) creepCount = 1;
        if (this.baseOp.phase >= c.BASE_PHASE_STORED_ENERGY) template = {body:[MOVE,CARRY,CARRY], maxLength:50}
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
            if (creepOp.instruction == c.COMMAND_NONE) {
                if (creepOp.idleTime >= c.TACTICS_INTERVAL && this.creepCount > 2 && creepOp.state != c.STATE_FINDENERGY) {
                    if (this._lastTickFull = Game.time - 1) creepOp.newParent(this._baseOp.buildingOp)
                    this._lastTickFull = Game.time;
                }
                else creepOp.instructFill();
            }
        }
    }

    _command() {
        // check to see if we nee
        let base = this._baseOp.base;
        if (base.energyAvailable < base.energyCapacityAvailable && this.lastIdle >= Game.time -1) this._tactics();

    }
}

