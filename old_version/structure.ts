"use strict";
import * as logger from 'logger';

Structure.prototype.reservedEnergy = 0;

Structure.prototype.initTick = function() {
    this.reservedEnergy = 0;
}

Structure.prototype.needsRepair = function() {
    if (this.hits < this.hitsMax - 1700) {
        if (this.structureType == STRUCTURE_ROAD && this.hitsMax > ROAD_HITS * CONSTRUCTION_COST_ROAD_SWAMP_RATIO) return false // only repair roads if they are on swamp or cheaper (NOT tunnels)
        return true
    } else {
        return false;
    }
}

