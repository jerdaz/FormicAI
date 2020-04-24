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
        let creepCount = 5;
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

    _command() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let curDest = creepOp.dest;
            if (!curDest || creepOp.instruction == c.COMMAND_NONE) this._fillNewStructure(creepOp);
            if (curDest && curDest.store) {
                let store = curDest.store;
                if (store[RESOURCE_ENERGY] == store.getCapacity(RESOURCE_ENERGY)) this._fillNewStructure(creepOp);
            } 
        }
    }

    /**@param {CreepOp} creepOp */
    _fillNewStructure(creepOp) {
        let dest = creepOp.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {Structure}*/ o) => {
            let store = /**@type {any} */ (o).store;
            if (store == undefined) return false
            return  (store[RESOURCE_ENERGY] < store.getCapacity(RESOURCE_ENERGY))
                    && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION || o.structureType == STRUCTURE_TOWER || o.structureType == STRUCTURE_LAB || 
                        (o.structureType == STRUCTURE_TERMINAL && store[RESOURCE_ENERGY] < c.MAX_TRANSACTION) 
                       // || (o.structureType == STRUCTURE_STORAGE && store[RESOURCE_ENERGY] < this._baseOp.base.energyCapacityAvailable)
                        );
            }})
        if (dest) creepOp.instructFill(dest);
        // if there is nothing to fill, make this creep an upgrader
        else if (this.creepCount > 2 && creepOp.state != c.STATE_FINDENERGY) {
            if (this._lastTickFull = Game.time - 1) creepOp.newParent(this._baseOp.buildingOp)
            this._lastTickFull = Game.time;
        }
    }
}

