"use strict";

import * as myFlags from 'myflags';


const FLAG_DESTROY_PRIM = COLOR_RED;
const FLAG_DESTROY_SEC = COLOR_WHITE;

const FLAG_REPAIR_PRIM = COLOR_PURPLE;
const FLAG_REPAIR_SEC = COLOR_PURPLE;
const FLAG_REPAIRNOW_PRIM = COLOR_PURPLE;
const FLAG_REPAIRNOW_SEC = COLOR_WHITE;
const FLAG_ROAD_PRIM = COLOR_BROWN;
const FLAG_ROAD_SEC = COLOR_BROWN;

RoomPosition.prototype.createDestroyFlag = function() {
    if (this.findInRange(FIND_FLAGS,0,{filter: (flag: Flag) => { return flag.color == FLAG_DESTROY_PRIM, flag.secondaryColor == FLAG_DESTROY_SEC}}).length == 0) {
        this.createFlag (undefined, FLAG_DESTROY_PRIM, FLAG_DESTROY_SEC);
    }
}

RoomPosition.prototype.createRepairFlag = function() {
    if (this.findInRange(FIND_FLAGS,0,{filter: (flag: Flag) => { return flag.color == FLAG_REPAIR_PRIM, flag.secondaryColor == FLAG_REPAIR_SEC}}).length == 0) {
        this.createFlag (undefined, FLAG_REPAIR_PRIM, FLAG_REPAIR_SEC);
    }
}
RoomPosition.prototype.createRepairNowFlag = function() {
    if (this.findInRange(FIND_FLAGS,0,{filter: (flag: Flag) => { return flag.color == FLAG_REPAIRNOW_PRIM, flag.secondaryColor == FLAG_REPAIRNOW_SEC}}).length == 0) {
        this.createFlag (undefined, FLAG_REPAIRNOW_PRIM, FLAG_REPAIRNOW_SEC);
    }
}

RoomPosition.prototype.getStructure = function() {
    var structures = this.lookFor(LOOK_STRUCTURES);
    for (var structure of structures) {
        if (structure.structureType != STRUCTURE_ROAD) return structure;
    }
    return undefined;
}

RoomPosition.prototype.getNearestLink = function() {
    return this.findClosestByRange(FIND_MY_STRUCTURES,
        {filter: (structure) => {return structure.structureType == STRUCTURE_LINK}});
}

RoomPosition.prototype.getInvader = function(){
    var invaders = Game.rooms[this.roomName].find(FIND_HOSTILE_CREEPS, {filter: o => {return o.owner.username != 'Source Keeper'}});
    var target = this.findClosestByPath(invaders);
    var targetHealParts = 0;
    for (var invader of invaders) {
        var body = invader.body;
        var healParts = 0;
        for (let bodyPart of body) if (bodyPart.type == HEAL) healParts++;
        if (healParts > targetHealParts) {
            target = invader;
            targetHealParts = healParts;
        }
    }
    return target;
}

RoomPosition.prototype.createRoadFlag = function() {
    let flagName = 'R' + Game.time + '_' + this.roomName + this.x + this.y;
    return this.createFlag(flagName ,FLAG_ROAD_PRIM, FLAG_ROAD_SEC)
}
