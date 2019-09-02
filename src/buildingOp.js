const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseChildOp');

module.exports = class BuildingOp extends BaseChildOp {
    get type() {return c.OPERATION_BUILDING}

    _strategy() {
        if (!this._baseOp) throw Error();
        let creepCount = 0;
        let constructionCount = this._baseOp.getBase().find(FIND_CONSTRUCTION_SITES).length
        if (constructionCount > 0) creepCount = 8;
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, creepCount)

        if (constructionCount>0) {
            for (let creepName in this._creepOps) {
                let creepOp = this._creepOps[creepName];
                let dest = creepOp.getDest();
                if (!(dest instanceof ConstructionSite)
                || (creepOp.getInstr() != c.COMMAND_TRANSFER) ) 
                {
                    let dest = creepOp.getPos().findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                    if (dest) creepOp.instructFill(dest);
                }
            }
        } else for (let creepName in this._creepOps) this._creepOps[creepName].setOperation(c.OPERATION_UPGRADING);

    }
}