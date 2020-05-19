const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const baseBuildOrder = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_STORAGE,];
const baseBuildTemplate = [
    {type: STRUCTURE_SPAWN},
    {type: STRUCTURE_EXTENSION},
    {type: STRUCTURE_TOWER},
    {type: STRUCTURE_STORAGE},
    {type: STRUCTURE_LINK, max:1},
    {type: STRUCTURE_TERMINAL},
    {type: STRUCTURE_LAB, max:1}
]

const TERRAIN_MASK_PLAIN = 0;

module.exports = class BasePlanOp extends BaseChildOp{
    /** 
     * @param {BaseOp} baseOp 
     */
    constructor (baseOp) {
        super(baseOp);

        // determine out center of the base
        /**@type {RoomPosition | undefined} */
        this._centerPos = undefined;
    }


    get type() {return c.OPERATION_BASEPLAN}
    get baseCenter() {return this._getBaseCenter();}

    _firstRun() {
        if (this._baseOp.base.controller.level == 1) this._support();
    }

    _support() {
        let base = this.baseOp.base;
        //find & destroy extensions that have become unreachable.
        for (let structure of base.find(FIND_MY_STRUCTURES)) {
            switch (structure.structureType) {
                case STRUCTURE_LAB: //fix labs with incorrect resource types
                    if (structure.mineralType && structure.mineralType != RESOURCE_CATALYZED_GHODIUM_ACID) structure.destroy();
                case STRUCTURE_EXTENSION:
                case STRUCTURE_STORAGE:
                case STRUCTURE_TOWER:
                case STRUCTURE_SPAWN:
                    if (!BasePlanOp._isValidBuildingSpot(structure.pos.x,structure.pos.y,this._baseOp,true)) structure.destroy();
                    break;
            }
        }
        for (let extension of this.baseOp.extensions) {
        }

        if (this.baseOp.linkOp.baseLinks.length > 1) this.baseOp.linkOp.baseLinks[1].destroy();
        
        for (let hostileStructure of base.find(FIND_HOSTILE_STRUCTURES)) hostileStructure.destroy();

    }

    _strategy(){
        let base = this.baseOp.base;
        if (base.find(FIND_MY_CONSTRUCTION_SITES).length > 0) return;
        let firstSpawn = this._baseOp.spawns[0];
        if (!firstSpawn) return;
        let lookResult = firstSpawn.pos.lookFor(LOOK_STRUCTURES);
        if (!(_.find(lookResult, { structureType: STRUCTURE_RAMPART}))) {
            firstSpawn.pos.createConstructionSite(STRUCTURE_RAMPART);
        }
    }

    _tactics() {
        let room = this.baseOp.base;
        let baseOp = this._baseOp;
        let structures = baseOp.myStructures;

        let constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)

        if (baseOp.spawns.length == 0) {
            for (let site of constructionSites) {
                if (site.structureType != STRUCTURE_SPAWN) site.remove();
            }
        } else if (constructionSites.length < c.MAX_CONSTRUCTION_SITES ) {

            for(let template of baseBuildTemplate) {
                let structureType = template.type;
                let curCount = (structures[structureType] == undefined) ? 0 : structures[structureType].length;
                curCount += _.filter(constructionSites, {structureType: structureType}).length;
                if( curCount < CONTROLLER_STRUCTURES[structureType][room.controller.level] && (template.max == undefined || template.max > curCount)) {
                    let pos = this._findBuildingSpot();
                    if (pos) pos.createConstructionSite(structureType);
                    else throw Error('WARNING: Cannot find building spot in room ' + room.name);
                }
            }
        }
    }

    
    _findBuildingSpot() {
        const CHECK = 20;
        const INVALID = 40;
        let centerPos = this.baseCenter;
        let terrain = Game.map.getRoomTerrain(this.baseOp.name);
        let roomName = this.baseOp.name;

        /**@type {number[][]} */
        let terrainArray = [];
        for (let x = 0; x<c.MAX_ROOM_SIZE; x++) {
            terrainArray[x] = [];
            for (let y=0; y<c.MAX_ROOM_SIZE; y++) {
                terrainArray[x][y] = terrain.get(x,y);
            }
        }

        /**@type {RoomPosition|undefined} */
        let validSpot = undefined;

        /**@type {RoomPosition[]} */
        let checkSpots = [];
        checkSpots.push(centerPos);

        while(checkSpots.length > 0 && validSpot == undefined) {
            /**@type {RoomPosition[]} */
            let newCheckSpots = [];
            for (let checkSpot of checkSpots) {
                let x = checkSpot.x;
                let y = checkSpot.y;
                if (BasePlanOp._isValidBuildingSpot(x,y, this.baseOp)) {
                    validSpot = new RoomPosition(x,y, roomName);
                    break;
                }
                else {
                    terrainArray[x][y] = INVALID;
                    for (let x_ = x-1; x_ <= x+1; x_++ ) {
                        for (let y_ = y-1; y_<=y+1; y_++) {
                            if (x==x_ || y==y_ || x_<2 || x_ > c.MAX_ROOM_SIZE-1 || y_ <2 || y_ > c.MAX_ROOM_SIZE-1) continue;
                            let terrain = terrainArray[x_][y_];
                            if (terrain == TERRAIN_MASK_SWAMP || terrain == TERRAIN_MASK_PLAIN ) {
                                terrainArray[x_][y_] = CHECK;
                                newCheckSpots.push(new RoomPosition(x_,y_, roomName));
                            };
                        }
                    }
                }
            }
            checkSpots = newCheckSpots;
        }

        if (validSpot) return validSpot;
        else return undefined;
    }
 
    /** 
     * @param {number} x
     * @param {number} y
     * @param {BaseOp} baseOp */
    static _isValidBuildingSpot(x, y, baseOp, ignoreStructures = false) {
        let base = baseOp.base;
        if (!base.controller) throw Error();
        if (x<2 || x > 47 || y < 2 || y > 47) return false;
        let pos = new RoomPosition(x, y, base.name)
        let terrain = pos.lookFor(LOOK_TERRAIN);
        if (_.includes(terrain,'wall')) return false;
        let structures = pos.lookFor(LOOK_STRUCTURES);
        let countStructures = 0;
        for (var i=0;i<structures.length;i++) if (structures[i].structureType != STRUCTURE_ROAD) countStructures++;
        if (!ignoreStructures && countStructures > 0) return false;
        let buildingsites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (!ignoreStructures && buildingsites.length > 0 ) return false;
        let sources = pos.findInRange(FIND_SOURCES,2);
        if (sources.length > 0) return false;
        let minerals = pos.findInRange(FIND_MINERALS,2);
        if (minerals.length > 0 ) return false;
        if (pos.inRangeTo(base.controller.pos,2)) return false;
        let walkable = false;
        for(let i=-1; i<=1; i++) {
            for (let j=-1; j<=1; j++) {
                let pos2 = new RoomPosition(pos.x+i, pos.y+j, base.name)
                if (U.isWalkable(pos2)) {
                    walkable = true;
                    break;
                }
            }
        }
        if (!walkable) return false;

        return true;
    }

     /**
     * @returns {RoomPosition}
     */
    _getBaseCenter() {
        if (this._centerPos == undefined) this._centerPos = this._calcBaseCenter();
        return this._centerPos;
    }

    /**
     * @returns {RoomPosition}
     */
    _calcBaseCenter() {
        let baseOp = this._baseOp
        let base = baseOp.base;
        let firstSpawn = baseOp.spawns[0];
        let firstConstructionSite = base.find(FIND_MY_CONSTRUCTION_SITES)[0];
        if (firstSpawn) return firstSpawn.pos;
        else if (firstConstructionSite) return firstConstructionSite.pos;

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
