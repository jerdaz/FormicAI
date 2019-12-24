const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_baseChildOp');

const TERMINAL_FILL_AMOUNT = 1000;

module.exports = class FillingOp extends BaseChildOp {
    get type() {return c.OPERATION_FILLING}

    _firstRun() {
        this._strategy();
    }
    
    _strategy() {
        let template = {body:[MOVE,CARRY,WORK]}
        let creepCount = 2;
        if (this.baseOp.phase >= c.BASE_PHASE_STORED_ENERGY) creepCount = 1;
        if (this.baseOp.phase >= c.BASE_PHASE_STORED_ENERGY) template = {body:[MOVE,CARRY]}
        this._baseOp.spawningOp.ltRequestSpawn(this, template, creepCount)
    }

    _command() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let dest = creepOp.dest;
            if (!(dest instanceof StructureSpawn || dest instanceof StructureExtension)
            || (creepOp.instruction != c.COMMAND_FILL)
            || (dest.energy && dest.energy == dest.energyCapacity) ) 
            {
                let dest = creepOp.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {Structure}*/ o) => {
                    let store = /**@type {any} */ (o).store;
                    if (store == undefined) return false
                    return  (store.energy < store.getCapacity(RESOURCE_ENERGY))
                            && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION || o.structureType == STRUCTURE_TOWER || 
                                (o.structureType == STRUCTURE_TERMINAL && store.energy < TERMINAL_FILL_AMOUNT));
                    }})
                if (dest) creepOp.instructFill(dest);
            }
        }
    }
}

