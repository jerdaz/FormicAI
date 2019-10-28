"use strict";

StructureLink.prototype.run = function() {
    if (this.isSource == undefined) {
        if (this.pos.findInRange(FIND_STRUCTURES,2,{filter: (structure: Structure) => {return structure.structureType == STRUCTURE_CONTROLLER}}).length>0) this.isSource = false;
        else this.isSource = true;
    }

    if (this.isSource && this.room.controller) {
        this.transferEnergy(this.room.controller.pos.getNearestLink());
    }
    return;
}
