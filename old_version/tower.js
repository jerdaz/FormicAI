"use strict";
// aantal hits repairen van walls (per controller level)
const repairLevel = 10000;

StructureTower.prototype.run = function() {
    //console.log('RUNNING TOWER: ' + this);

    var hostile = this.room.getInvader();
    if (hostile) {
        this.attack(hostile);
        return;
    }
    var creepsHit = this.room.find(FIND_MY_CREEPS, {filter: (creep) => {return (creep.hits < creep.hitsMax );}} );
    if (creepsHit.length > 0) {
        this.heal(this.pos.findClosestByRange(creepsHit));
        return;
    }
    var structuresHit = this.room.find(FIND_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_CONTAINER && structure.hits < structure.hitsMax - 800 && structure.hits < repairLevel * structure.room.controller.level)}});
    if (structuresHit.length > 0) {
        var target = structuresHit[0];
        for(var i = 1;i<structuresHit.length;i++) if (target.hits > structuresHit[i].hits) target = structuresHit[i];
        this.repair(target);
        return;
    }
}
