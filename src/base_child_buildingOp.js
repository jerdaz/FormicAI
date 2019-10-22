const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_baseChildOp');

module.exports = class BuildingOp extends BaseChildOp {
    get type() {return c.OPERATION_BUILDING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let creepCount = 0;
        let constructionCount = this._baseOp.base.find(FIND_CONSTRUCTION_SITES).length
        if (constructionCount > 0) creepCount = 8;
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, creepCount)
    }

    _tactics() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let dest = creepOp.dest;
            if (!(dest instanceof ConstructionSite)
            || (creepOp.instruction != c.COMMAND_TRANSFER) ) 
            {
                let dest = creepOp.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                if (dest) creepOp.instructFill(dest);
            }
        }
    }
}
