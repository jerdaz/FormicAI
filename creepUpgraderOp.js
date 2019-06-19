let U = require('./util');
const c = require('./constants');
let BaseOp = require('./baseOp');
let CreepOp = require('./creepOp');
let CreepRoleOp = require('./creepRoleOp');

module.exports = class CreepUpgraderOp extends CreepRoleOp {
    _strategy() {
        let creepOp = this._creepOp;
        let dest = creepOp.getDest();
        let newCommand = false;
        if (!(dest instanceof StructureController)
           || (creepOp.getInstr().command == undefined) )
        {
            let instr = {command: c.COMMAND_TRANSFER
                        , source: creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE)
                        , dest: this._baseOp.getBase().controller}
            creepOp.setInstr(instr);
        }
    }
}
