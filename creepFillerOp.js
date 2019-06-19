let U = require('./util');
let c = require('./constants');
let BaseOp = require('./baseOp');
let CreepOp = require('./creepOp');
let CreepRoleOp = require('./creepRoleOp');

module.exports = class CreepFillerOp extends CreepRoleOp {
    _strategy() {
        let creepOp = this._creepOp;
        let dest = creepOp.getDest();
        let newCommand = false;
        if (!(dest instanceof StructureSpawn || dest instanceof StructureExtension)
           || (creepOp.getInstr().command == undefined)
           || (dest.energy && dest.energy == dest.energyCapacity) ) 
           {
            let instr = {command: c.COMMAND_TRANSFER
                        , source: creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE)
                        , dest: creepOp.getPos().findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {any}*/ o) => {
                            return  (o.energy < o.energyCapacity)
                                    && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION);
                            }})
                        };
            creepOp.setInstr(instr);
        }
    }
}

