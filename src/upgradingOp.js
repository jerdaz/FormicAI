const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseChildOp');

const ENERGY_RESERVE = 0.1 * STORAGE_CAPACITY

module.exports = class UpgradingOp extends BaseChildOp {
    get type() {return c.OPERATION_UPGRADING}

    _strategy() {
        if (this.baseOp.phase < c.BASE_PHASE_HARVESTER) this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 8)
        else if (this.baseOp.storage) {
            let energy = this.baseOp.storage.store.energy;
            let workerCount = Math.floor((energy - ENERGY_RESERVE ) / (MAX_CREEP_SIZE / 3 * UPGRADE_CONTROLLER_POWER * CREEP_LIFE_TIME))
            if (workerCount < 0) workerCount = 0;
            if (this.baseOp.phase >= c.BASE_PHASE_EOL && workerCount > 2) workerCount = 2
            if (workerCount < 1 && this.baseOp.getBase().controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[1]/4) workerCount = 1;
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, workerCount)
        }

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let dest = creepOp.getDest();
            if (!(dest instanceof StructureController)
            || (creepOp.getInstr() != c.COMMAND_TRANSFER) )
            {
                let dest = this._baseOp.getBase().controller;
                if (dest) creepOp.instructFill(dest);
            }
        }
    }
}
