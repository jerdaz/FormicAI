const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_baseChildOp');

const ENERGY_RESERVE = 0.1 * STORAGE_CAPACITY
const REDUCE_UPGRADER_COUNT_LEVEL = 6
const MAX_UPGRADER_COUNT = 15
const DOWNGRADE_RESERVE = 0.75

module.exports = class UpgradingOp extends BaseChildOp {
    get type() {return c.OPERATION_UPGRADING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        if (this.baseOp.phase < c.BASE_PHASE_HARVESTER || this.baseOp.base.controller.level < REDUCE_UPGRADER_COUNT_LEVEL) this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 15)
        else if (this.baseOp.storage) {
            let energy = this.baseOp.storage.store.energy;
            let workerCount = Math.floor((energy - ENERGY_RESERVE ) / (MAX_CREEP_SIZE / 3 * UPGRADE_CONTROLLER_POWER * CREEP_LIFE_TIME))
            if (workerCount < 0) workerCount = 0;
            if (this.baseOp.phase >= c.BASE_PHASE_EOL && workerCount > 2) workerCount = 2
            if (workerCount < 1 && this.baseOp.base.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[1]*DOWNGRADE_RESERVE) workerCount = 1;
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, workerCount)
        }
    }

    _tactics() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let dest = creepOp.dest;
            if (!(dest instanceof StructureController)
            || (creepOp.instruction != c.COMMAND_TRANSFER) )
            {
                let dest = this._baseOp.base.controller;
                if (dest) creepOp.instructFill(dest);
            }
        }
    }
}
