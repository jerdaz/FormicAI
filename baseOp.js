let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
let CreepFillerOp = require('./creepFillerOp');
let CreepUpgraderOp = require('./creepUpgraderOp');
let CreepBuilderOp = require('./creepBuilderOp');
let SpawnOp = require ('./structSpawnOp');
/** @typedef {import('./shardOp')} ShardOp */
/** @typedef {import('./creepRoleOp')} CreepRoleOp} */

module.exports = class BaseOp extends Operation{
    /** @param {Base} base */
    /** @param {ShardOp} shardOp */
    constructor (base, shardOp) {
        super();
        this._shardOp = shardOp;

        /**@type {Base} */
        this._base = base;
        /**@type {string[]} */
        this._creepNames = [];

        /**@type {{[creepName:string]: CreepRoleOp}} */
        this._creepRoleOps = {};

        /**@type {{[id:string]: SpawnOp}} */
        this._spawnOps = {};
        this._spawnCommand = c.ROLE_NONE;

        let firstSpawn = this.getMyStructures(STRUCTURE_SPAWN)[0];

        if (firstSpawn) this._centerPos = firstSpawn.pos;
        else this._centerPos = this._getBaseCenter();

        this._fillerEmergency = false;
    }

    /**@param {Base} base */
    /**@param {string[]} creepNames */
    initTick(base, creepNames) {
        this._base = base;
        this._creepNames = creepNames;
        this._myStructures = {};
        for (let structure of this._base.find(FIND_MY_STRUCTURES)) {
            switch (structure.structureType) {
                case STRUCTURE_SPAWN:
                    if (this._spawnOps[structure.id] === undefined ) this._spawnOps[structure.id] = new SpawnOp(structure, this)
                    else this._spawnOps[structure.id].initTick(structure);
                    break;
            }
        }
        for (let creepName of this._creepNames) {
            let creep = this._shardOp.getCreep(creepName);
            if (!creep) throw Error;
            if (this._creepRoleOps[creepName] === undefined) {
                let role = parseInt(creep.name.split('_')[1]);
                /**@type CreepRoleOp */
                let ret;
                switch (role) {
                    case c.ROLE_FILLER:
                        ret = new CreepFillerOp(creep, this);
                        break;
                    case c.ROLE_UPGRADER:
                        ret = new CreepUpgraderOp(creep, this);
                        break;
                    case c.ROLE_BUILDER:
                        ret = new CreepBuilderOp(creep, this);
                        break;
                    default:
                        throw Error;
                        break;
                }
                this._creepRoleOps[creepName] = ret;
            }
            this._creepRoleOps[creepName].initTick(creep)
        }
    }

    /**@param {string} structureType */
    /**@returns {Structure[]} */
    getMyStructures(structureType) {
        return this._base.find(FIND_MY_STRUCTURES, {filter: {structureType: structureType}})
    }

    getBase() {
        return this._base;
    }

    getSpawnCommand() {
        return this._spawnCommand;
    }

    getMaxSpawnEnergy() {
        if (this._fillerEmergency) return SPAWN_ENERGY_CAPACITY;
        else return this._base.energyCapacityAvailable;
    }



    _strategy() {
        if (U.chance(100)) {
            let nConstructionSites = this._base.find(FIND_MY_CONSTRUCTION_SITES).length;
            this._planBase(nConstructionSites);
        }
        if (U.chance(10)) {
            let nConstructionSites = this._base.find(FIND_MY_CONSTRUCTION_SITES).length;
            this._planCreeps(nConstructionSites);
        }
    }

    _command() {
        for (let creepName in this._creepRoleOps) {
            if (this._shardOp.getCreep(creepName)) this._creepRoleOps[creepName].run();
            else delete this._creepRoleOps[creepName];
        }
        for (let id in this._spawnOps) {
            if (U.getObj(id)) this._spawnOps[id].run();
            else delete this._spawnOps[id];
        }
    }    
    
    /**@param {number} nConstructionSites */
    _planBase(nConstructionSites) {
        let room = this._base;
        let nExtensions = this.getMyStructures(STRUCTURE_EXTENSION).length;
        if (nConstructionSites == 0 && nExtensions < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]) {
            let pos = this._findBuildingSpot();
            if (pos) pos.createConstructionSite(STRUCTURE_EXTENSION);
            else console.log('WARNING: Cannot find building spot in room ' + room.name);
        }
    }

    /**@param {number} nConstructionSites */
    _planCreeps(nConstructionSites) {
        let base = this._base;
        /**@type {number[]} */
        let nCreeps = [];

        for (let i=1; i<=c.ROLE_MAX; i++) nCreeps[i] = 0;
        
        for (let creepName in this._creepRoleOps) {
            let creepRoleOp = this._creepRoleOps[creepName];
            let role = creepRoleOp.getRole();
            nCreeps [role]++;
        }
        let spawnCommand = c.ROLE_NONE;
        this._fillerEmergency = false;
        if (nCreeps[c.ROLE_FILLER] < 1 ) { spawnCommand = c.ROLE_FILLER; this._fillerEmergency = true; }
        else if (nCreeps[c.ROLE_FILLER] < 2 ) spawnCommand = c.ROLE_FILLER;
        else if (nCreeps[c.ROLE_UPGRADER] < 1) spawnCommand = c.ROLE_UPGRADER;
        else if (nConstructionSites > 0 && nCreeps[c.ROLE_BUILDER] < 4) spawnCommand = c.ROLE_BUILDER;
        else if (nCreeps[c.ROLE_UPGRADER] < 15) spawnCommand = c.ROLE_UPGRADER;
        this._spawnCommand = spawnCommand;
    }

        
    _findBuildingSpot() {
        let x_ = this._centerPos.x;
        let y_ = this._centerPos.y;
        let x = 0;
        let y = 0;
    
        let i=1;
        loop:
        while (i<50) {
            for(x = -1 * i;x<=1*i;x++ ) {
                for (y = -1 * i; y<= 1*i; y++) {
                    if ( (x+y) % 2 == 0 && _isValidBuildingSpot(x_+x, y_+y, this._base))
                        break loop;
                }
            }
            i++;
        }
    
        if (i<50) return new RoomPosition (x_+x,y_+y, this._base.name);
        return undefined;

   
        /** @param {number} x */
        /** @param {number} y */
        /** @param {Base} base */
        function _isValidBuildingSpot(x, y, base) {
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
                    var terrain =base.getTerrain().get(x+nx, y+ny);
                    if (terrain == TERRAIN_MASK_WALL) return false;
                }
            }
            return true;
        }

    }
 
    _getBaseCenter() {
        let base = this._base;
        let x = 0;
        let y = 0;
        let n = 0;

        x += base.controller.pos.x;
        y += base.controller.pos.y;
        n += 1;

        for (let source of /**@type {Source[]} */(base.find(FIND_SOURCES))) {
            x += source.pos.x;
            y += source.pos.y;
            n += 1;
        }

        for (let source of /**@type {Mineral[]} */(base.find(FIND_MINERALS))) {
            x += source.pos.x;
            y += source.pos.y;
            n += 1;
        }

        x = Math.round(x / n);
        y = Math.round(y / n);

        let spawnX = x;
        let spawnY = y;
        let validSpot;
        do {
            validSpot = true;
            spawnX = (spawnX + _.random(-1, 1) - 2 ) % 46 + 2;
            spawnY = (spawnY + _.random(-1, 1) - 2 ) % 46 + 2;

            for (let nx=-3;nx<=3;nx++) {
                for (let ny=-3;ny<=3;ny++) {
                    var terrain = Game.map.getTerrainAt(spawnX + nx, spawnY + ny, base.name);
                    if (terrain == 'wall' )  validSpot = false;
                }
            }
        }
        while (validSpot == false )

        let result = new RoomPosition(x, y, base.name);
        return result;
    } 
}
