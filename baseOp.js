'use strict'

let creepFillerOps = require('./creepFillerOps');
let creepUpgraderOps = require('./creepUpgraderOps');
let creepBuilderOps = require('./creepBuilderOps');
let SpawnOp = require ('./structSpawnOp');

module.exports = class BaseOp {
    /** @param {string} roomName */
    constructor (roomName) {
        /** @type {string[]} */
        this._creepNames = [];

        /** @type {string} */
        this._roomName = roomName;

        /**@type {RoomStructures} */
        this._structures = { 
            spawns: []
          , extensions: []
        }

        /**@type {Room} */
        this._room = Game.rooms[this._roomName];

        /**@type {SpawnOp[]} */
        this._spawnOps = [];
    }

    run() {
        this._refreshGameObjects();
    
        if (Math.floor(Math.random() * 10) == 0) this._strategy();
        
        this._command();
    }

    /**@param {Creep} creep */
    addCreep(creep) {
        this._creepNames.push (creep.name);
    }

    _refreshGameObjects() {
        this._room = Game.rooms[this._roomName];
        this._structures.spawns=[];
        this._spawnOps=[];
        this._structures.extensions=[];

        for (let structure of this._room.find(FIND_MY_STRUCTURES)) {
            switch (structure.structureType) {
                case STRUCTURE_SPAWN:
                    this._structures.spawns.push(structure);
                    this._spawnOps.push(new SpawnOp(structure))
                    break;
                case STRUCTURE_EXTENSION:
                    this._structures.extensions.push(structure);
                    break;
            }
        }
    }


    _strategy() {
        let nConstructionSites = this._room.find(FIND_MY_CONSTRUCTION_SITES).length;
        this._planBase(nConstructionSites);
        this._planCreeps(nConstructionSites);
    }

    _command() {
        this._creepOperation();
        this._buildingOperation();
    }    
    
    /**@param {number} nConstructionSites */
    _planBase(nConstructionSites) {
        let room = this._room;
        if (!room.controller) throw Error;
        if (nConstructionSites == 0 && this._structures.extensions.length < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]) {
            let pos = this._findBuildingSpot();
            if (pos) pos.createConstructionSite(STRUCTURE_EXTENSION);
            else console.log('WARNING: Cannot find building spot in room ' + room.name);
        }
    }

    /**@param {number} nConstructionSites */
    _planCreeps(nConstructionSites) {
        let base = this._room;
        /**@type {{[key:string]:number}} */
        let nCreeps = {'filler': 0, 'upgrader':0, 'builder':0};
        for (let creepName of this._creepNames) {
            let role = Memory.creeps[creepName].role;
            if (nCreeps [role] == undefined) nCreeps [role] = 0;
            else nCreeps [role]++;
        }
        let spawnCommand = '';
        if (nCreeps['filler'] < 1 ) spawnCommand = 'spawnFirstFiller';
        else if (nCreeps['filler'] < 2 ) spawnCommand = 'spawnFiller';
        else if (nCreeps['upgrader'] < 1) spawnCommand = 'spawnUpgrader';
        else if (nConstructionSites > 0 && nCreeps['builder'] < 4) spawnCommand = 'spawnBuilder';
        else if (nCreeps['upgrader'] < 15) spawnCommand = 'spawnUpgrader';
        for (let spawnOp of this._spawnOps) spawnOp.command = spawnCommand;
    }

    _creepOperation() {
        for (let creepName of this._creepNames) {
            switch (Memory.creeps[creepName].role) {
                case 'filler':
                    creepFillerOps(creepName);
                    break;
                case 'upgrader':
                    creepUpgraderOps(creepName);
                    break;
                case 'builder':
                    creepBuilderOps(creepName);
                    break;
            }
        }
    }
        
    _buildingOperation() {
        for (let spawnOp of this._spawnOps) spawnOp.run();
    }
        
    _findBuildingSpot() {
        let room = this._room;
        let spawn = this._structures.spawns[0];
        let x = spawn.pos.x;
        let y = spawn.pos.y;
    
        let i=1;
        loop:
        while (i<50) {
            for(x = -1 * i;x<=1*i;x++ ) {
                for (y = -1 * i; y<= 1*i; y++) {
                    if ( (x+y) % 2 == 0 && this._validBuildingSpot(spawn.pos.x+x, spawn.pos.y+y))
                        break loop;
                }
            }
            i++;
        }
    
        if (i<50) return new RoomPosition (spawn.pos.x+x,spawn.pos.y+y, room.name);
        return undefined;
    }
    
    /** @param {number} x */
    /** @param {number} y */
    _validBuildingSpot(x, y) {
        let base = this._room;
        if (!base.controller) throw Error;
        if (x<2 || x > 47 || y < 2 || y > 47) return false;
        var pos = new RoomPosition(x, y, base.name)
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
        if (pos.inRangeTo(base.controller.pos,2)) return false;
        for (let nx=-1;nx<=1;nx++) {
            for (let ny=-1;ny<=1;ny++) {
                if (Math.abs(nx) + Math.abs(ny) == 2) continue; // hoek mag wel grenzen met muur.
                var terrain =base.lookForAt(LOOK_TERRAIN, x+nx, y+ny);
                if (terrain[0] == 'wall' ) return false;
            }
        }
        return true;
    }
}
