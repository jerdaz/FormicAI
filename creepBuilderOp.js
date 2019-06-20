let U = require('./util');
const c = require('./constants');
let CreepRoleOp = require('./creepRoleOp');

module.exports = class CreepBuilderOp extends CreepRoleOp {
    _strategy() {
        let creepOp = this._creepOp;
        let dest = creepOp.getDest();
        if (!(dest instanceof ConstructionSite)
           || (creepOp.getInstr() != c.COMMAND_TRANSFER) )
        {
            let source = creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE);
            let dest = creepOp.getPos().findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
            if (source && dest) creepOp.instructTransfer(source, dest);
        }
    }
}
