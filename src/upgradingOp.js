const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseChildOp');

module.exports = class UpgradingOp extends BaseChildOp {
    _strategy() {
        if(!this._baseOp) throw Error();
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 8)

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let dest = creepOp.getDest();
            if (!(dest instanceof StructureController)
            || (creepOp.getInstr() != c.COMMAND_TRANSFER) )
            {
                let source = creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE);
                let dest = this._baseOp.getBase().controller;
                if (source && dest) creepOp.instructTransfer(source, dest);
            }
        }
    }
}
