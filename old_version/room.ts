"use strict";


import 'structure';
import 'creep';
import 'tower';
import 'spawn';
import 'link';
import 'terminal';
import Atlas from 'atlas';
import * as logger from 'logger';
import * as consts from 'consts';

declare var _:any;

const maxHarvestDistance = 3;
const MAX_COLONIZATION_DIST = 10;
const allies = [''];
const HARVEST_DEFENSE_TIME = 3000;
const KEEPER_HARVESTING = true; // wel of geen keeper lairs harvesten (is nog experimenteel)
const MIN_STORAGE_ENERGY = 25000; // the minimum amount of energy in the main storage, before transporters start dropping energy in other droppoints (like terminals)

const MY_CONTROLLER_STRUCTURES: {[key:string]:{[key:number]:number}} = {
    "spawn": {0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 3},
    "extension": {0: 0, 1: 0, 2: 5, 3: 10, 4: 20, 5: 30, 6: 40, 7: 50, 8: 60},
    "link": {1: 0, 2: 0, 3: 0, 4: 0, 5: 2, 6: 3, 7: 4, 8: 6},
    "road": {0: 2500, 1: 2500, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500},
    "constructedWall": {1: 0, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500},
    "rampart": {1: 0, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500},
    "storage": {1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1},
    "tower": {1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 6},
    "observer": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1},
    "powerSpawn": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1},
    "extractor": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1},
    "terminal": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1},
    "lab": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 3, 7: 6, 8: 10},
    "container": {0: 5, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5},
    "nuker": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1}
}


Room.prototype.rememberRoom = function() {
    let scoutInfo = Game.atlas.getScoutInfo(this.name);

    // niet veranderende scoutinfo alleen eerste keer of bij nieuwe structuur
    if (scoutInfo == undefined || scoutInfo.version == undefined || scoutInfo.version < 2) {
        this.memory.scoutInfo = {};
        scoutInfo = this.memory.scoutInfo;
        scoutInfo.hasKeepers = this.find(FIND_HOSTILE_STRUCTURES,{filter: (structure: Structure) => {return structure.structureType == STRUCTURE_KEEPER_LAIR}}).length > 0;
        scoutInfo.sourceCount = this.find(FIND_SOURCES).length;
        scoutInfo.hasController = (this.controller != undefined);
        scoutInfo.towerCount = this.find(FIND_HOSTILE_STRUCTURES,{filter: (structure: Structure) => {return structure.structureType == STRUCTURE_TOWER}}).length;
        scoutInfo.sources = {};
        for (let source of this.find(FIND_SOURCES)) {
            scoutInfo.sources[source.id] = {pos_x: source.pos.x, pos_y: source.pos.y }
        }
        scoutInfo.version = 2;
    }
    scoutInfo.lastSeen = Game.time;
    if (this.controller) scoutInfo.level = this.controller.level
    else scoutInfo.level = 0;
    if (this.controller && this.controller.owner) scoutInfo.ownerUserName = this.controller.owner.username;
    if (this.controller) scoutInfo.myRoom = this.controller.my;
    else scoutInfo.myRoom = false;
    scoutInfo.hasEnemyCreeps = this.find(FIND_HOSTILE_CREEPS, {filter: (o:Creep) => {return o.owner.username != consts.USERNAME_SOURCEKEEPER }}).length > 0;
}

RoomObject.prototype.reservedEnergy = 0;


Room.prototype.hasFiller = function() {
    return this.find(FIND_MY_CREEPS, {filter: (creep: Creep) => {return creep.memory.role == 'filler'}}).length > 0;
}
Room.prototype.hasWorker = function() {
    return this.find(FIND_MY_CREEPS, {filter: (creep: Creep) => {return creep.memory.role == 'worker'}}).length > 0;
}
Room.prototype.countFillers = function() {
    return this.find(FIND_MY_CREEPS, {filter: (creep: Creep) => {return creep.memory.role == 'filler'}}).length;
}

Room.prototype.hasHarvester = function() {
    return this.find(FIND_MY_CREEPS, {filter: (creep: Creep) => {return creep.memory.role == 'harvester'}}).length > 0;
}

Room.prototype.isSKLair = function() {
    if (this.name === 'sim') return false;
    let parsed;
    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(this.name) as any;
    let fMod = parsed[1] % 10;
    let sMod = parsed[2] % 10;
    let isSK =  !(fMod === 5 && sMod === 5) &&
        ((fMod >= 4) && (fMod <= 6)) &&
        ((sMod >= 4) && (sMod <= 6));
    return isSK
}


Room.prototype.isValidHarvestRoom = function(roomName: string, baseLevel:number) {
    var room = Game.rooms[roomName]
    var validHarvest = true;
    var validPassage = true;
    let scoutInfo = Game.atlas.getScoutInfo(roomName);
    if (scoutInfo ) {
        if (scoutInfo.hasEnemyCreeps) {validHarvest = false; validPassage = false}
        if (scoutInfo.sourceCount == 0) validHarvest = false;
        //if (scoutInfo.controllerLevel > 0 && ! scoutInfo.myRoom) validHarvest = false;
        if (Game.time - scoutInfo.lastHarvest < HARVEST_DEFENSE_TIME) {validHarvest = true; validPassage = true}
        if (scoutInfo.hasKeepers && (baseLevel < 7 || !KEEPER_HARVESTING)) validHarvest = false;
        if (room && this != room && room.controller && room.controller.my) validHarvest = false
    } else {validHarvest = false; validPassage = false}

    //xawirxes unscoutable room
    //if (roomName == 'W12N56') validHarvest = false;

    //ontoegankelijke room, pathfinding issues
    //if (roomName == 'W3N57') validHarvest = false;

    //roadbuild pathfinder issue, weg wordt te lang
    //if (roomName == 'W14N51') validHarvest = false;
    //keeper lair
    //if (roomName == 'W15N55') validHarvest = false;
    //if (roomName == 'W14N55') validHarvest = false;
return {validHarvest: validHarvest, validPassage: validPassage};
}

Room.prototype._fhrCache = [] ;
Room.prototype.findHarvestRooms = function() {

    //uit cache halen indien mogelijk
    if (this._fhrCache[this.name] && Game.time - this._fhrCache[this.name].gameTime < 1000) return this._fhrCache[this.name].result

    var roomDist = new Map();
    roomDist.set(this.name, 0);
    var depth = 0;
    var result =[this.name]

    while (depth < maxHarvestDistance) {
        for (var [roomName, dist] of roomDist) {
            if (dist == depth) {
                logger.log('room.findharvestrooms', 'checking room ' + roomName + ' at distance ' + depth)
                var exits:any = Game.map.describeExits(roomName)
                for (var exitkey in exits) {
                    var roomName:any = exits[exitkey];
                    var curRoomDist = roomDist.get(roomName);
                    if ((curRoomDist == undefined || curRoomDist > depth + 1) )  {
                        let resultVal = this.isValidHarvestRoom(roomName, this.controller.level);
                        if (resultVal.validPassage) {
                            // resultaat opslaan
                            logger.log('room.findharvestrooms', 'adding room ' + roomName + ' at distance ' + (depth+1))
                            roomDist.set(roomName, depth + 1);
                            if (resultVal.validHarvest){
                                result.push(roomName);
                            }
                        }
                    }
                }
            }
        }
        depth++;
    }

    for (let roomName of result) {
        // source afstanden uitrekenen
        let scoutInfo = Game.atlas.getScoutInfo(roomName);
        if (scoutInfo) {
            for (let sourceId in scoutInfo.sources) {
                logger.log ('room.findharvestrooms', 'adding distance for source ' + sourceId)
                let pathSource;
                if (this.getSpawn()) {
                    pathSource = this.getSpawn().pos
                } else {
                    pathSource = Game.atlas.getRoomCenter(this.name) // indien er (nog) geen spawn is, dan midden van de kamer nemen
                }
                let result = PathFinder.search(pathSource, {pos: new RoomPosition(scoutInfo.sources[sourceId].pos_x, scoutInfo.sources[sourceId].pos_y, roomName), range: 1}, {maxOps: 20000});
                if (result) {
                    if (scoutInfo.sources[sourceId].roomDistance == undefined) scoutInfo.sources[sourceId].roomDistance = {};
                    scoutInfo.sources[sourceId].roomDistance[this.name] = result.path.length;
                }
            }
        }
    }



    logger.log('room.findharvestrooms', result)
    this._fhrCache[this.name] = {result: result, gameTime: Game.time};
    return result;

}

Room.prototype.getInvader = function(){
    var invaders = this.find(FIND_HOSTILE_CREEPS, {filter: (creep: Creep) => {
        for (let ally of allies) if (creep.owner.username == ally) return false;
        return true;
    }});
    var target = invaders[0];
    var targetHealParts = 0;
    for (var invader of invaders) {
        var body = invader.body;
        var healParts = 0;
        for (var bodyPart of body) if(bodyPart.type == HEAL) healParts++;
        if (healParts < targetHealParts) {
            target = invader;
            targetHealParts = healParts;
        }
    }
    return target;
}


Room.prototype.getStoredEnergy = function() {
    let result = 0;
    let capacity = 0;
    if (this.storage && this.storage.isActive()) {result += this.storage.store.energy; capacity += this.storage.storeCapacity }
    if (this.terminal && this.terminal.isActive()) {result += this.terminal.store.energy; capacity += this.terminal.storeCapacity }
    else {
        for (let container of this.getContainers()) { result += container.store.energy; capacity += container.storeCapacity }
    }
    return {result: result, capacity: capacity};
}

Room.prototype.getContainers = function() {
    return this.find(FIND_STRUCTURES, {filter: (structure: Structure) => {return structure.structureType == STRUCTURE_CONTAINER}})
}


Room.prototype.autoBuild = function (){
    if (this.controller == undefined || this.controller.level < 2) {
        // vijandelijke structures afbreken
        let structures = this.find(FIND_STRUCTURES);
        for (let structure of structures) {
            if (structure.owner && !structure.my ) structure.destroy();
        }
        return; // indien geen controller, niet builden
    }
    if (Game.time % 300 != 0 && this.name != '')  return; //maar 1x per 100 turn autobuilden
    if (this.getSpawn() == undefined) return;
    logger.log ('room.autobuild', 'autobuilding room ' + this.name )

     //niet autobouwen als er nog iets te bouwen is;
    if (this.find(FIND_MY_CONSTRUCTION_SITES).length > 0) return


    var structures = this.find(FIND_STRUCTURES);



    logger.log ('room.autobuild', 'building structures')
//gebouwen maken
    var structuretypes= [STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER, STRUCTURE_TOWER, STRUCTURE_LINK, STRUCTURE_TERMINAL];
    let nonBaseContainerCount = 0;
    let nonBaseLinkCount = 0;
    if (this.controller.getContainer()) nonBaseContainerCount++;
    if (this.controller.pos.findInRange(FIND_MY_STRUCTURES, 2,{filter: (structure: Structure) =>{return structure.structureType == STRUCTURE_LINK} }).length > 0) nonBaseLinkCount++;
    for (source of this.findSources()) if (source.getContainer()) nonBaseContainerCount++;
    //logger.log ('room.autobuild', 'nonbasecount container: ' + nonBaseContainerCount)


    for (var i=0;i<structuretypes.length;i++) {
        var countStructures = 0
        for (var j=0;j<structures.length;j++) {
            if (structures[j].structureType == structuretypes[i] ) {
                countStructures++;
                //logger.log('room.autobuild', 'building found' + structuretypes[i])
            }
        }

        var max_default_structures = MY_CONTROLLER_STRUCTURES[structuretypes[i]];
        var max_structures = max_default_structures[this.controller.level]
        if (structuretypes[i] == STRUCTURE_CONTAINER) {
            if (this.controller.level >= 3) max_structures = Math.min(2 + nonBaseContainerCount, max_structures);
            else max_structures = 0
        }
        if (structuretypes[i] == STRUCTURE_LINK) max_structures= Math.min( 1 + nonBaseLinkCount, max_structures);

        if (countStructures < max_structures) {
            //console.log (structuretypes[i])
            var pos = this.findBuildingSpot();
            logger.log ('room.autobuild', 'buildingspot: ' + pos + ' ' +structuretypes[i] + ' ' + max_structures +' '+  countStructures)
            this.createConstructionSite(pos,structuretypes[i]);
            //roads om gebouw heen maken
            this.createConstructionSite(pos.x+1,pos.y,STRUCTURE_ROAD);
            this.createConstructionSite(pos.x-1,pos.y,STRUCTURE_ROAD);
            this.createConstructionSite(pos.x,pos.y+1,STRUCTURE_ROAD);
            this.createConstructionSite(pos.x,pos.y-1,STRUCTURE_ROAD);
            break;
        }
    }

    logger.log ('room.autobuild', 'building roads')

    //infra bouwen (wegen containers)
    if (this.controller.level >= 2) {
        // weg naar controller bouwen, indien voldoende spawn capaciteit voor upgrader. vanaf level 3 een container, level 5 een link en level 6 een terminal)
        if (this.getEnergyCapacityAvailable() >=550) this.getSpawn().buildPath(this.controller.pos, (this.controller.level>=3), (this.controller.level>=5), (this.controller.level >= 6 &&this.controller.level < 8))
        for(var source of this.find(FIND_SOURCES)) {
             //logger.log('room.autobuild', 'buildingpath from to: ' )
             this.getSpawn().buildPath(source.pos, this.controller.level>=3);
             this.controller.buildPath(source.pos,false)
        }
    }

    //rebuild roads that may have fallen
    for (let structure of this.find(FIND_MY_STRUCTURES)) {
        if (structure.structureType == STRUCTURE_CONTROLLER) continue;
        let pos = structure.pos;
        let buildRoad = function(room:Room, x:number, y:number) {if (room.getTerrain().get(x,y) != TERRAIN_MASK_WALL) room.createConstructionSite(x, y, STRUCTURE_ROAD) }
        buildRoad(this, pos.x+1,pos.y);
        buildRoad(this, pos.x-1,pos.y);
        buildRoad(this, pos.x,pos.y+1);
        buildRoad(this, pos.x,pos.y-1);
    }

    //destroy structures not near main base that should be there
    // currently: move the terminal within range of the base.
    if (this.controller.level == 8) {
        let centerPos = this.getSpawn().pos;
        let structures = this.find(FIND_MY_STRUCTURES)
        for (let structure of structures) {
            if (structure.structureType == STRUCTURE_TERMINAL
                && structure.pos.getRangeTo(centerPos) > 12
                ) {
                structure.destroy();
            }
        }
    }
}



Room.prototype.findBuildingSpot = function() {
    //console.log('FINDBUILDINGSPOT')
    var spawn = this.getSpawn();
    var x = spawn.pos.x;
    var y = spawn.pos.y;

    var i=1;
    var x;
    var y;
    loop:
    while (i<50) {
        for(x = -1 * i;x<=1*i;x++ ) {
            for (y = -1 * i; y<= 1*i; y++) {
                //console.log(x + ' ' +  y)
                if ( (x+y) % 2 == 0 && this.validBuildingSpot(spawn.pos.x+x, spawn.pos.y+y))
                    break loop;
            }
        }
        i++;
    }

    if (i<50) return new RoomPosition (spawn.pos.x+x,spawn.pos.y+y, this.name);
    return undefined;
}

Room.prototype.validBuildingSpot = function(x: number, y: number) {
    //console.log('validbuildingspot ' +x + ' '+y)
    if (x<2 || x > 47 || y < 2 || y > 47) return false;
    var pos = new RoomPosition(x, y, this.name)
    var structures = pos.lookFor(LOOK_STRUCTURES);
    var buildingsites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
    var sources = pos.findInRange(FIND_SOURCES,2);
    var minerals = pos.findInRange(FIND_MINERALS,2);
    var countStructures = 0;
    for (var i=0;i<structures.length;i++) if (structures[i].structureType != STRUCTURE_ROAD) countStructures++;
    if (countStructures > 0) return false;
    if (buildingsites.length > 0 ) return false;
    if (sources.length > 0) return false;
    if (minerals.length > 0 ) return false;
    if (pos.inRangeTo(this.controller.pos,2)) return false;
    for (let nx=-1;nx<=1;nx++) {
        for (let ny=-1;ny<=1;ny++) {
            if (Math.abs(nx) + Math.abs(ny) == 2) continue; // hoek mag wel grenzen met muur.
            var terrain =this.lookForAt(LOOK_TERRAIN, x+nx, y+ny);
            logger.log('room.validbuildingspot', `looking at ${x+nx}, ${y+ny}`)
            logger.log ('room.validbuildingspot', terrain);
            if (terrain[0] == 'wall' ) return false;
        }
    }

    return true;
}

Room.prototype.getSpawn= function() {
    return this.find(FIND_MY_STRUCTURES, {filter: (structure: Structure) => {return structure.structureType==STRUCTURE_SPAWN}})[0];
}



Room.prototype.initTick = function () {
    //structures initialiseren
    //this.find(FIND_STRUCTURES).forEach(function(structure: Structure){ structure.initTick()});

    //alle dropped energie initialiseren
    this.find(FIND_DROPPED_RESOURCES).forEach(function(dropped: Resource){ dropped.reservedEnergy=0;})
    this.find(FIND_TOMBSTONES).forEach(function(tombstone: Tombstone){ tombstone.reservedEnergy=0;})

    //indien leeg moving average voor idle workers initialiseren.
    if (this.memory.avgIdleWorkers == undefined) {
        this.memory.avgIdleWorkers = [];
        for(var i=0; i<300; i++) this.memory.avgIdleWorkers[i] = 0;
    };
    if (this.memory.avgIdleUpgraders == undefined) {
        this.memory.avgIdleUpgraders = [];
        for(var i=0; i<300; i++) this.memory.avgIdleUpgraders[i] = 0;
    };

    //this.visual.text(roomValue.get(this.name),1,1);

}


Room.prototype.findSources = function () {
    return this.find(FIND_SOURCES);
}

Room.prototype.getLinks = function() {
    return this.find(FIND_MY_STRUCTURES,{filter: (structure: Structure) => {return structure.structureType == STRUCTURE_LINK}})
}

//Find the container where energy can be deposited in a room
Room.prototype.findEnergyDropPoints = function(amount: number) {
    if (this.storage && this.storage.isActive() && this.storage.store.energy < MIN_STORAGE_ENERGY) return [this.storage];
    return this.find(FIND_STRUCTURES,{filter: (structure: Structure) => {
            //logger.log('room.findenergydroppoints', JSON.stringify(structure))
            if (!structure.isActive()) return false;
            if (structure.structureType == STRUCTURE_CONTAINER && structure.pos.findInRange(FIND_SOURCES,1).length>0) return false;
            let structureTypes:StructureConstant[] = [STRUCTURE_CONTAINER, STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_LINK, STRUCTURE_TOWER, STRUCTURE_TERMINAL];
            let freeCapacity = 0;
            if (structure.store) {
                freeCapacity = structure.storeCapacity - _.sum(structure.store) //- structure.reservedEnergy;
            } else if (structure.energy) {
                freeCapacity = structure.energyCapacity - structure.energy// - structure.reservedEnergy;
            }
            logger.log('room.findenergydroppoints', structureTypes.includes(structure.structureType) && amount < freeCapacity)

            return structureTypes.includes(structure.structureType) && amount < freeCapacity
        }
    })
}

/*
Room.prototype.findEmptyCreeps = function() {
    var creeps = this.find(FIND_MY_CREEPS, {filter: (creep: Creep) => {return creep.carry.energy == 0 || creep.memory.inQueue==true }});
    return creeps;
}
*/

Room.prototype.checkNukes = function() {
    var nukes = this.find(FIND_NUKES);
    var landingtime = NUKE_LAND_TIME;
    for (var nuke of nukes) if (nuke.timeToLand < landingtime) landingtime = nuke.timeToLand;
    if (landingtime + 1 < SAFE_MODE_DURATION) this.controller.activateSafeMode();
}

Room.prototype.getEnergyCapacityAvailable = function() {
    return this.energyCapacityAvailable;
    //return Math.min (this.energyCapacityAvailable, this.energyAvailable)
}

Room.prototype.run = function() {
    logger.log('room.run', this.name)
    this.initTick();
    var lastErr;

    this.rememberRoom();




//    if (Game.time % 10 == 0) this.calculateRoomValue();
    // foutmelding triggeren
    if (lastErr) throw lastErr;
}


Room.prototype.visualize = function(){
    for (let source of this.find(FIND_SOURCES)){
        this.visual.text(Math.floor(Memory.transportLoad[source.id]), source.pos)
    }
}
