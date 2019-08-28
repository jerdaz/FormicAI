const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseChildOp');

module.exports = class FillingOp extends BaseChildOp {
    get type() {return c.OPERATION_FILLING}

    _strategy() {
        if (this._baseOp) this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 2)
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let dest = creepOp.getDest();
            if (!(dest instanceof StructureSpawn || dest instanceof StructureExtension)
            || (creepOp.getInstr() != c.COMMAND_TRANSFER)
            || (dest.energy && dest.energy == dest.energyCapacity) ) 
            {
                let source = creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE)
                let dest = creepOp.getPos().findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {any}*/ o) => {
                    return  (o.energy < o.energyCapacity)
                            && (o.structureType == STRUCTURE_TOWER);
                    }})
                if (!dest) dest = creepOp.getPos().findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {any}*/ o) => {
                    return  (o.energy < o.energyCapacity)
                            && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION);
                    }})
                                    
                if (source && dest) creepOp.instructTransfer(source, dest);
            }
        }
    }
}

