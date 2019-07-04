let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
let TeamFillingOp = require('./teamFillingOp');
let TeamUpgradingOp = require('./teamUpgradingOp');
let TeamBuildingOp = require('./teamBuildingOp');
let TeamColonizingOp = require('./teamColonizingOp');
let SpawningOp = require ('./spawningOp');
let TowerOp = require('./towerOp');
/** @typedef {import('./shardOp')} ShardOp */
/** @typedef {import ('./teamOp')} TeamOp */

module.exports = class BaseOp extends Operation{
    /** @param {Base} base */
    /** @param {Creep[]} creeps */
    /** @param {ShardOp} shardOp */
    constructor (base, creeps, shardOp) {
        super();
        this._shardOp = shardOp;

        /**@type {Base} */
        this._base = base;
        this._directive = c.DIRECTIVE_NONE;

        /**@type {SpawningOp}} */
        this._spawningOp = new SpawningOp(/**@type {StructureSpawn[]} */(this.getMyStructures(STRUCTURE_SPAWN)), this);
        /**@type {TowerOp}} */
        this._towerOp = new TowerOp(/**@type {StructureTower[]} */(this.getMyStructures(STRUCTURE_TOWER)), this);
        /**@type {TeamFillingOp} */
        this._teamFillingOp = new TeamFillingOp(this);
        /**@type {TeamBuildingOp} */
        this._teamBuildingOp = new TeamBuildingOp(this);
        /**@type {TeamUpgradingOp} */
        this._teamUpgradingOp = new TeamUpgradingOp(this);
        /**@type {TeamColonizingOp} */
        this._teamColonizingOp = new TeamColonizingOp(this, this._shardOp.getMap());
        
        let firstSpawn = this.getMyStructures(STRUCTURE_SPAWN)[0];
        if (firstSpawn) this._centerPos = firstSpawn.pos;
        else this._centerPos = this._getBaseCenter();

        this._fillerEmergency = false;
        for (let hostileStructure of base.find(FIND_HOSTILE_STRUCTURES)) hostileStructure.destroy();
        this.initTick(base, creeps);
    }

    /**@param {Base} base */
    /**@param {Creep[]} creeps */
    initTick(base, creeps) {
        this._base = base;
        this._spawningOp.initTick(/**@type {StructureSpawn[]} */(this.getMyStructures(STRUCTURE_SPAWN)))
        this._towerOp.initTick(/**@type {StructureTower[]} */(this.getMyStructures(STRUCTURE_TOWER)) )
        /**@type {Creep[][]} */
        let teamCreeps = [];
        if (creeps) {
            for (let creep of creeps) {
                let opType = creep.memory.operation || parseInt(creep.name.split('_')[1]);
                if (!teamCreeps[opType]) teamCreeps[opType] = [];
                teamCreeps[opType].push(creep);
            }
        }
        this._teamFillingOp.initTick(teamCreeps[c.OPERATION_FILLING]);
        this._teamUpgradingOp.initTick(teamCreeps[c.OPERATION_UPGRADING]);
        this._teamBuildingOp.initTick(teamCreeps[c.OPERATION_BUILDING]);
        this._teamColonizingOp.initTick(teamCreeps[c.OPERATION_COLONIZING]);
    }

    hasSpawn() {
        return this.getMyStructures(STRUCTURE_SPAWN).length > 0;
    }

    /**@param {number} directive */
    setDirective(directive) {
        this._directive = directive;
    }

    getDirective(){
        return this._directive;
    }

    getName() {
        return this._base.name;
    }

    /**@param {string} structureType */
    /**@returns {Structure[]} */
    getMyStructures(structureType) {
        return this._base.find(FIND_MY_STRUCTURES, {filter: {structureType: structureType}})
    }

    getBase() {
        return this._base;
    }

    getLevel() {
        return this._base.controller.level;
    }

    getMaxSpawnEnergy() {
        if (this._teamFillingOp.getCreepCount() == 0) return this._base.energyAvailable;
        else return this._base.energyCapacityAvailable;
    }

    /**@param {number} opType */
    /**@returns {TeamOp} */
    getSubTeamOp(opType) {
        /**@type {TeamOp} */
        let ret;
        switch (opType) {
            case c.OPERATION_BUILDING:
                ret = this._teamBuildingOp;
                break;
            case c.OPERATION_FILLING:
                ret = this._teamFillingOp;
                break;
            case c.OPERATION_UPGRADING:
                ret = this._teamUpgradingOp;
                break;
            case c.OPERATION_COLONIZING:
                ret = this._teamColonizingOp;
                break;
            default:
                throw Error();
                break;
        }
        return ret;
    }

    /**@param {number} opType */
    /**@param {CreepTemplate} template */
    /**@param {number} count */
    ltRequestSpawn(opType, template, count) {
        this._spawningOp.ltRequestSpawn(opType, template, count);
    }

    /**@param {string} roomName */
    requestBuilder(roomName) {
        this._spawningOp.requestBuilder(roomName);
    }

    /**@param {string} shard */
    /**@param {number} requestType} */
    requestShardColonization(shard, requestType) {
        this._spawningOp.requestShardColonizers(shard, requestType);
    }

    _strategy() {
        if (U.chance(10)) {
            this._planBase();
        }
    }

    _command() {
        this._teamFillingOp.run();
        this._teamBuildingOp.run();
        this._teamUpgradingOp.run();
        this._teamColonizingOp.run();
        this._towerOp.run();
        this._spawningOp.run();
    }    
    
    _planBase() {
        let room = this._base;
        let nConstructionSites = this._base.find(FIND_MY_CONSTRUCTION_SITES).length;
        let nExtensions = this.getMyStructures(STRUCTURE_EXTENSION).length;
        let nSpawns = this.getMyStructures(STRUCTURE_SPAWN).length;
        let nTowers = this.getMyStructures(STRUCTURE_TOWER).length;
        if (nConstructionSites == 0 && nSpawns < CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][room.controller.level]) {
            let pos = this._findBuildingSpot();
            if (pos) pos.createConstructionSite(STRUCTURE_SPAWN);
            else console.log('WARNING: Cannot find building spot in room ' + room.name);
        }
        else if (nConstructionSites == 0 && nExtensions < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]) {
            let pos = this._findBuildingSpot();
            if (pos) pos.createConstructionSite(STRUCTURE_EXTENSION);
            else console.log('WARNING: Cannot find building spot in room ' + room.name);
        }
        else if (nConstructionSites == 0 && nTowers < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][room.controller.level]) {
            let pos = this._findBuildingSpot();
            if (pos) pos.createConstructionSite(STRUCTURE_TOWER);
            else console.log('WARNING: Cannot find building spot in room ' + room.name);
        }
        else if (nSpawns == 0 && this._teamBuildingOp.getCreepCount() == 0) {
            this._shardOp.requestBuilder(room.name);
        }
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
            if (!base.controller) throw Error();
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
 
    getBaseCenter() {
        return this._centerPos;
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

        
        x = Math.round(x / n);
        y = Math.round(y / n);

        let spawnX = x;
        let spawnY = y;
        let validSpot;
        let roomTerrain = base.getTerrain();
        do {
            validSpot = true;
            spawnX = spawnX + _.random(-1, 1) ;
            spawnY = spawnY + _.random(-1, 1) ;
            if (spawnX <4 || spawnX > 45) spawnX = 25;
            if (spawnY <4 || spawnY > 45) spawnY = 25;

            for (let nx=-2;nx<=2;nx++) {
                for (let ny=-2;ny<=2;ny++) {
                    var terrain = roomTerrain.get(spawnX + nx, spawnY + ny);
                    if (terrain == TERRAIN_MASK_WALL) validSpot = false;
                }
            }
        }
        while (validSpot == false )

        let result = new RoomPosition(spawnX, spawnY, base.name);
        return result;
    } 
}
