const U = require('./util');
const c = require('./constants');
const FillingOp = require('./fillingOp');
const UpgradingOp = require('./upgradingOp');
const BuildingOp = require('./buildingOp');
const SpawningOp = require ('./spawningOp');
const TowerOp = require('./towerOp');
const ShardChildOp = require('./shardChildOp');
const ColonizingOp = require('./colonizingOp');

const baseBuildOrder = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_STORAGE];

module.exports = class BaseOp extends ShardChildOp{
    /** @param {Base} base */
    /** @param {ShardOp} shardOp */
    constructor (base, shardOp) {
        super(shardOp, shardOp);

        /**@type {Base} */
        this._base = base;
        this._name = base.name;
        this._directive = c.DIRECTIVE_NONE;

        this._addChildOp(new SpawningOp(this));
        this._addChildOp(new TowerOp(this));
        this._addChildOp(new FillingOp(this));
        this._addChildOp(new BuildingOp(this));
        this._addChildOp(new UpgradingOp(this));
        this._addChildOp(new ColonizingOp(this,shardOp, this));

        // determine out center of the base
        this._centerPos = this._getBaseCenter();

        this._fillerEmergency = false;
        for (let hostileStructure of base.find(FIND_HOSTILE_STRUCTURES)) hostileStructure.destroy();

        /**@type {{[index:string]:Structure[]}} */
        this._structures = {};
    }

    initTick() {
        super.initTick();
        this._base = /**@type {Base} */ (Game.rooms[this._name])
        this._structures = {};
        let structures = this._base.find(FIND_MY_STRUCTURES);
        for (let structure of structures) {
            if (this._structures[structure.structureType] == undefined) this._structures[structure.structureType] = [];
            this._structures[structure.structureType].push(structure);
        }
    }

    get type() {return c.OPERATION_BASE}
    get fillingOp() {return /**@type {FillingOp} */(this._childOps[c.OPERATION_FILLING][0]) };
    get buildingOp() {return /**@type {BuildingOp} */(this._childOps[c.OPERATION_BUILDING][0]) };
    get spawningOp() {return /**@type {SpawningOp} */(this._childOps[c.OPERATION_SPAWNING][0]) };    
    get extensions() {return /**@type {StructureExtension[]}*/ (this._structures[STRUCTURE_EXTENSION]) || []}
    get name() {return this._name}


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
        if (this.fillingOp.getCreepCount() == 0) return this._base.energyAvailable;
        else return this._base.energyCapacityAvailable;
    }


    /**@param {string} roomName */
    requestBuilder(roomName) {
        this.spawningOp.requestBuilder(roomName);
    }

    /**@param {string} shard */
    /**@param {number} requestType} */
    requestShardColonization(shard, requestType) {
        this.spawningOp.requestShardColonizers(shard, requestType);
    }

    _strategy() {
        if (U.chance(10)) {
            this._planBase();
            if (this.hasSpawn() == false && this._base.find(FIND_HOSTILE_CREEPS).length > 0) this._base.controller.unclaim();
        }

        //find & destroy extensions that have become unreachable.
        if (U.chance(1000)) {
            for (let extension of this.extensions) {
                let walkable = false;
                let pos = extension.pos;
                for(let i=-1; i<=1; i++) {
                    for (let j=-1; j<=1; j++) {
                        let pos2 = new RoomPosition(pos.x+i, pos.y+j, this.name)
                        if (U.isWalkable(pos2)) {
                            walkable = true;
                            break;
                        }
                    }
                    if (!walkable) extension.destroy();
                }

            }
        }
    }

    
    _planBase() {
        let room = this._base;
        if ((this._structures[STRUCTURE_SPAWN] == undefined || this._structures[STRUCTURE_SPAWN].length == 0) && this.buildingOp.getCreepCount() == 0) {
            this._shardOp.requestBuilder(room.name);
        }
        if (this._base.find(FIND_MY_CONSTRUCTION_SITES).length > 0) return;
        for(let structureType of baseBuildOrder) {
            if(this._structures[structureType] == undefined || this._structures[structureType].length < CONTROLLER_STRUCTURES[structureType][room.controller.level] ) {
                let pos = this._findBuildingSpot();
                if (pos) pos.createConstructionSite(structureType);
                else throw Error('WARNING: Cannot find building spot in room ' + room.name);
            }
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
        let firstSpawn = this.getMyStructures(STRUCTURE_SPAWN)[0];
        let firstConstructionSite = this._base.find(FIND_MY_CONSTRUCTION_SITES)[0];
        if (firstSpawn) return firstSpawn.pos;
        else if (firstConstructionSite) return firstConstructionSite.pos;

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
