let U = require('./util');
const c = require('./constants');
let CreepTeamOp = require('./teamOp');

module.exports = class CreepUpgraderOp extends CreepTeamOp {
    _strategy() {
        this._spawningOp.ltRequestSpawn(c.OPERATION_UPGRADING, 8)

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let dest = creepOp.getDest();
            if (!(dest instanceof ConstructionSite)
            || (creepOp.getInstr() != c.COMMAND_TRANSFER) )
            {
                let source = creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE);
                let dest = this._baseOp.getBase().controller;
                if (source && dest) creepOp.instructTransfer(source, dest);
            }
        }
    }
}
