const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');


module.exports = class FillingOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        this._lastTickFull = 0;
        this._avgFillstate = 0.2;
        if (!baseOp.base.memory.fillerSize) baseOp.base.memory.fillerSize = 50;
    }
    get type() {return c.OPERATION_FILLING}

    _firstRun() {
        this._strategy();
    }
    
    _support() {
        let fillerSize = this._baseOp.base.memory.fillerSize;
        

        if (this.baseOp.phase >= c.BASE_PHASE_HARVESTER ) {
            if (this._avgFillstate < 0.2 ) fillerSize++;
            else if (this._avgFillstate > 0.2) fillerSize--; 
            if (fillerSize > 50) fillerSize = 50;
            if (fillerSize < 2) fillerSize = 2;
        } else {
            fillerSize = 50;
        }        

        this._baseOp.base.memory.fillerSize = fillerSize;
    }

    _strategy() {
        let fillerSize = this._baseOp.base.memory.fillerSize;
        

        let template = {body:[MOVE,WORK,CARRY], maxLength: 5*3}
        let creepCount = 10;
        if (this.baseOp.phase >= c.BASE_PHASE_HARVESTER ) {
            creepCount = 1;
        }
        if (this.baseOp.phase >= c.BASE_PHASE_STORED_ENERGY) template = {body:[MOVE,CARRY,CARRY], maxLength:fillerSize}
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
            let creep = creepOp.creep;
            if (creepOp.instruction == c.COMMAND_NONE) {
                if (creepOp.idleTime >= c.TACTICS_INTERVAL && this.creepCount > 2 && creepOp.state != c.STATE_FINDENERGY) {
                    if (this._lastTickFull = Game.time - 1) creepOp.newParent(this._baseOp.buildingOp)
                    this._lastTickFull = Game.time;
                }
                else creepOp.instructFill();
            }
            
            //recycle when nearly dead
            if (creep.ticksToLive && creep.ticksToLive < 100 && this._baseOp.deathContainer) {
                let distance = creep.pos.findPathTo(this._baseOp.deathContainer.pos).length;
                if (creep.ticksToLive - c.TACTICS_INTERVAL <= distance) creepOp.instructRecycle();
            }
        }

        //update avg fill state
        let base = this._baseOp.base;
        this._avgFillstate = this._avgFillstate / 150 * 149 + ((base.energyAvailable == base.energyCapacityAvailable)?1:0) / 150;
    }

    _command() {
        // check to see if we nee
        let base = this._baseOp.base;
        if (base.energyAvailable < base.energyCapacityAvailable && this.lastIdle >= Game.time -1) this._tactics();

    }
}

