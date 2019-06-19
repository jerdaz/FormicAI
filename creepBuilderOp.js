let U = require('./util');
const c = require('./constants');
let BaseOp = require('./baseOp');
let CreepOp = require('./creepOp');
let CreepRoleOp = require('./creepRoleOp');

module.exports = class CreepBuilderOp extends CreepRoleOp {
    _strategy() {
        let creepOp = this._creepOp;
        let dest = creepOp.getDest();
        let newCommand = false;
        if (!(dest instanceof ConstructionSite)
           || (creepOp.getInstr().command == undefined) )
        {
            let instr = {command: c.COMMAND_TRANSFER
                        , source: creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE)
                        , dest: creepOp.getPos().findClosestByPath(FIND_MY_CONSTRUCTION_SITES)}
            creepOp.setInstr(instr);
        }
    }
}
