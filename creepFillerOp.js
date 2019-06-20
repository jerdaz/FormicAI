let U = require('./util');
const c = require('./constants');
let CreepRoleOp = require('./creepRoleOp');
/**@typedef {import('./creepRoleOp')} CreepRoleOp} */

module.exports = class CreepFillerOp extends CreepRoleOp {
    _strategy() {
        let creepOp = this._creepOp;
        let dest = creepOp.getDest();
        if (!(dest instanceof StructureSpawn || dest instanceof StructureExtension)
           || (creepOp.getInstr() != c.COMMAND_TRANSFER)
           || (dest.energy && dest.energy == dest.energyCapacity) ) 
        {
            let source = creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE)
            let dest = creepOp.getPos().findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {any}*/ o) => {
                            return  (o.energy < o.energyCapacity)
                                    && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION);
                            }})
                        
            if (source && dest) creepOp.instructTransfer(source, dest);
        }
    }
}
