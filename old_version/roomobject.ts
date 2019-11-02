"use strict";

import * as logger from 'logger';
//import * as Traveler from 'Traveler';

import 'pos';


export default function() {};

// get container near roomobject
RoomObject.prototype.getContainer = function() {
    var result:RoomObject[] = this.pos.findInRange(FIND_STRUCTURES, 1, {filter: (structure: Structure) => {return structure.structureType == STRUCTURE_CONTAINER}});
    if (result.length > 1) result[1].destroy();
    if (result == undefined) result = this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 1, {filter: (csite: ConstructionSite) => {return csite.structureType == STRUCTURE_CONTAINER}});
    if (result == undefined) result = [this];
    //if (result == undefined) result = this.pos.findInRange(FIND_DROPPED_RESOURCES,1)[0];
    return result[0];
}

//build path
RoomObject.prototype.buildPath = function(dest: RoomPosition, buildcontainer = false, buildlink = false, buildterminal = false) {
    logger.log('roomobject.buildpath', this.pos + ' to ' + dest)
    var result = PathFinder.search(this.pos,{pos: dest, range: 1},{maxOps: 100000 ,
                                                                    plainCost: 8,
                                                                    swampCost: 10,
                                                                    roomCallback: function(roomName) {
                                                                        let costMatrix = new PathFinder.CostMatrix;
                                                                        let room = Game.rooms[roomName];
                                                                        let scoutInfo = Game.atlas.getScoutInfo(roomName);
                                                                        if (scoutInfo == undefined || scoutInfo.hasEnemyCreeps) return false; // don't build path in enemy territory
                                                                        logger.log ('roomobject.buildpath', roomName)
                                                                        if (!room) return costMatrix;
                                                                        let structures = room.find(FIND_STRUCTURES);
                                                                        for (let structure of structures) {
                                                                            let value;
                                                                            switch (structure.structureType) {
                                                                                case STRUCTURE_ROAD:
                                                                                    value = 6;
                                                                                    break;
                                                                                case STRUCTURE_CONTAINER:
                                                                                    value = 1;
                                                                                    break;
                                                                                case STRUCTURE_LINK:
                                                                                    value = 1;
                                                                                    break;
                                                                                case STRUCTURE_WALL:
                                                                                    value = 8 + Math.ceil(structure.hits * 246 / structure.hitsMax)
                                                                                default:
                                                                                    value = 255;
                                                                                    break;

                                                                            }
                                                                            costMatrix.set(structure.pos.x, structure.pos.y, value);
                                                                        }
                                                                        // road construction site tellen als gebouwde weg.
                                                                        for (let csite of room.find(FIND_CONSTRUCTION_SITES, {filter: (csite:ConstructionSite) => {return csite.structureType == STRUCTURE_ROAD }})) {
                                                                            costMatrix.set(csite.pos.x, csite.pos.y, 6);

                                                                        }

                                                                        // om keepers heenbouwen
                                                                        for(var invader of Game.rooms[roomName].find(FIND_HOSTILE_CREEPS, {filter: (creep) => {return creep.owner.username == 'Source Keeper'}})) {
                                                                            for (var x=-3; x <=3; x++) {
                                                                                for (var y=-3; y <=3; y++) {
                                                                                    costMatrix.set(invader.pos.x + x,invader.pos.y + y,255) // set square 3x3 around invader nonwalkable
                                                                                }
                                                                            }
                                                                        }

                                                                        for(var lair of room.find(FIND_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_KEEPER_LAIR} })) {
                                                                            for (var x=-3; x <=3; x++) {
                                                                                for (var y=-3; y <=3; y++) {
                                                                                    costMatrix.set(lair.pos.x + x,lair.pos.y + y,255) // set square 3x3 around invader nonwalkable
                                                                                }
                                                                            }
                                                                        }

                                                                        return costMatrix;
                                                                    }
                                                                  }) ;
//    console.log ('buildpath: ' + result.incomplete  + ' ' + result.ops)

 logger.log('roomobject.buildpath', result)
for(var i=result.path.length-1;i>0;i--){ // 0 niet bouwen, dat is de structure zelf omgekeerd bouwen, eerst container en pad vanaf container.
        var pos = result.path[i];
        let targetRoom = Game.rooms[pos.roomName]
        if (targetRoom == undefined) continue;
      //  if (i>100) logger.log('roomobject.buildpath', i + ' ' + pos)
        if (targetRoom) targetRoom.visual.circle(pos)   ;
        var structures = pos.lookFor(LOOK_STRUCTURES);
        var flags = pos.lookFor(LOOK_FLAGS);
        var hasRoad = false;
        var hasWall = false;
        for (var j=0;j<structures.length;j++) if (structures[j].structureType == STRUCTURE_ROAD) {
            hasRoad = true;
            var roadHitsPct = structures[j].hits / structures[j].hitsMax;
        }
        for (var j=0;j<structures.length;j++) if (structures[j].structureType == STRUCTURE_WALL) hasWall = true;
        //else if (roadHitsPct < 0.25) pos.createRepairNowFlag();
        //else if (roadHitsPct < 0.9) pos.createRepairFlag();
        if (hasWall) pos.createDestroyFlag();
        if (buildcontainer && i == result.path.length -1 ) {  // container bouwen bij bestemming
            var hasContainer = false
            for (var j=0;j<structures.length;j++) if (structures[j].structureType == STRUCTURE_CONTAINER) hasContainer = true;
            if (hasContainer == false) logger.log ('roombobject.buildpath', pos.createConstructionSite(STRUCTURE_CONTAINER));
        }
        if (buildlink && i == result.path.length - 2) { // linkbouwen 2 bij controller vandaan
            let hasLink = false;
            for (let structure of structures) if (structure.structureType == STRUCTURE_LINK) hasLink = true;
            if (hasLink == false) pos.createConstructionSite (STRUCTURE_LINK);
        }
        if (targetRoom && buildterminal && i == result.path.length -3 && targetRoom.controller && targetRoom.controller.level >= 6) {
            let hasTerminal = false;
            if (targetRoom.controller.pos.findInRange(FIND_MY_STRUCTURES, 3, {filter: (o:Structure) => {return o.structureType == STRUCTURE_TERMINAL}}).length>=1) hasTerminal = true;
            if (hasTerminal == false) {
                if (targetRoom.terminal) targetRoom.terminal.destroy();
                pos.createConstructionSite (STRUCTURE_TERMINAL);
            }
        }
        if (hasRoad == false && flags.length == 0 && pos.x > 0 && pos.x <49 && pos.y > 0 && pos.y < 49) pos.createRoadFlag(Math.floor(Game.time/1000)); //pos.createConstructionSite(STRUCTURE_ROAD);
    }
}
