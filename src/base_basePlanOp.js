const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');
const { MAX_ROOM_SIZE } = require('./constants');

const baseBuildOrder = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_STORAGE,];
const baseBuildTemplate = [
    {type: STRUCTURE_EXTENSION},
    {type: STRUCTURE_TOWER},
    {type: STRUCTURE_STORAGE},
    {type: STRUCTURE_LINK, max:1},
    {type: STRUCTURE_TERMINAL},
    {type: STRUCTURE_SPAWN},
//  {type: STRUCTURE_LAB, max:1}
]

const baseCoreOffset = {x:-1, y:-1}; // starting point of base
const CORE_OUTER_RADIUS = 2; // radius of core with free space around it
const CORE_INNER_RADIUS = 1; // radius of the base core used for placing buildings
// BASE TEMPLATE IS UPSIDE DOWN, builds from down to up (first south row with spawn, finally terminal row north)
/**@type {(BuildableStructureConstant|null)[][]} */
const baseCoreTemplate = [[STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_TOWER],
                          [STRUCTURE_STORAGE, null, STRUCTURE_LINK],
                          [STRUCTURE_TOWER,STRUCTURE_TERMINAL, STRUCTURE_TOWER]]

    

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
        this._maxWallHeight = c.MAX_WALL_HEIGHT;
    }


    get type() {return c.OPERATION_BASEPLAN}
    get baseCenter() {return this._getBaseCenter();}
    get maxWallHeight() {return this._maxWallHeight}

    _firstRun() {
        //if (this._baseOp.base.controller.level == 1) this._support();
        this._support();
    }


    _support() {
        //check for new build links and notify link Operations
        this._baseOp.transportOp.updateLinks();
        let base = this.baseOp.base;

        //update maximum wall height
        //ramparts shouldn't be repaired beyond 2x the lowest height
        let ramparts = this._baseOp.myStructures[STRUCTURE_RAMPART];
        let minHeight = 0;
        for (let rampart of ramparts) {
            //only repair ramparts protecting structures
            let structures = rampart.pos.lookFor(LOOK_STRUCTURES);
            _.remove(structures,{structureType:STRUCTURE_ROAD});
            if (structures.length <=1) continue;
            if (rampart.hits > minHeight) minHeight = rampart.hits
        }
        let roomLevel = 1;
        if (this._baseOp) roomLevel = this._baseOp.level
        this._maxWallHeight = Math.min(c.MAX_WALL_HEIGHT * RAMPART_HITS_MAX[this._baseOp.level], minHeight*2);       
        if (this._maxWallHeight <= RAMPART_DECAY_AMOUNT * 2) this._maxWallHeight = RAMPART_DECAY_AMOUNT * 2 + 1;            


        //find & destroy improperly placed buildings.
        //destroy center structure if necessary (transport creep lives there);
        let centerStructures = this.baseCenter.lookFor(LOOK_STRUCTURES);
        for (let structure of centerStructures) {
            switch (structure.structureType) {
                case STRUCTURE_ROAD:
                case STRUCTURE_CONTAINER:
                case STRUCTURE_RAMPART:
                    break;
                default:
                    structure.destroy();
                    break;
            }
        }
        //check all other structures as well
        let gridRemainder = (this.baseCenter.x + this.baseCenter.y) % 2
        for (let structure of base.find(FIND_STRUCTURES)) {
            switch (structure.structureType) {
                case STRUCTURE_LAB: //fix labs with incorrect resource types
                    if (structure.mineralType && structure.mineralType != RESOURCE_CATALYZED_GHODIUM_ACID) structure.destroy();
                case STRUCTURE_EXTENSION:
                case STRUCTURE_TOWER:
                case STRUCTURE_SPAWN:
                    if (
                          (
                              !BasePlanOp._isValidBuildingSpot(structure.pos.x,structure.pos.y,this._baseOp,true) 
                              || 
                              (structure.pos.x+structure.pos.y) % 2 != gridRemainder
                          )
                          && !structure.pos.inRangeTo(this.baseCenter,CORE_INNER_RADIUS)
                       ) 
                        {
                           structure.destroy();
                        }
                    break;
                case STRUCTURE_STORAGE:
                    if (!structure.pos.isEqualTo(this.baseCenter.x-1,this.baseCenter.y)) structure.destroy();
                    break;
                case STRUCTURE_TERMINAL:
                    if (!structure.pos.isEqualTo(this.baseCenter.x,this.baseCenter.y-1)) structure.destroy();
                    break;
                case STRUCTURE_LAB:
                    break;
                case STRUCTURE_LINK:
                    let linkOp = this.baseOp.transportOp;
                    if (   (!linkOp.baseLink || linkOp.baseLink.id != structure.id)
                        && (!linkOp.controllerLink || linkOp.controllerLink.id != structure.id)
                        && !_.includes(linkOp.sourceLinks, structure)) {
                            U.l({destroylink:structure.pos})//structure.destroy();
                        }
                    break;
                case STRUCTURE_WALL:
                    structure.destroy();
                    break;
                }
        }
        
        // if there is no baselink, it cannot be build because there ar too many links and there is a controller link, destroy it.
        if (!this.baseOp.transportOp.baseLink 
            && this.baseOp.myStructures[STRUCTURE_LINK].length>= CONTROLLER_STRUCTURES[STRUCTURE_LINK][this.baseOp.level]
            && this.baseOp.transportOp.controllerLink) this.baseOp.transportOp.controllerLink.destroy();

        //destroy all hostile structures
        for (let hostileStructure of base.find(FIND_HOSTILE_STRUCTURES)) hostileStructure.destroy();

        // if there are too many spawns for controller level, start removing them because the primary spawn
        // MUST be active
        // also destroy one spawn if there is no spawn in the core.
        if (this.baseOp.spawns.length >= CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][this.baseOp.base.controller.level]) {
            let coreSpawn = null;
            for (let spawn of this.baseOp.spawns) {
                if (spawn.pos.x == this.baseCenter.x && spawn.pos.y == this.baseCenter.y +1 ) coreSpawn = spawn;
            }
            if (!coreSpawn || this.baseOp.spawns.length > CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][this.baseOp.base.controller.level]) {
                for (let spawn of this.baseOp.spawns) {
                    if (spawn != coreSpawn) {
                        spawn.destroy();
                        break;
                    }
                }
            }
        }

    }

    // _strategy(){
    //     let base = this.baseOp.base;
    //     if (base.find(FIND_MY_CONSTRUCTION_SITES).length < c.MAX_CONSTRUCTION_SITES) {
    //         let firstSpawn = this._baseOp.spawns[0];
    //         let result = 0;
    //         if (firstSpawn) result = firstSpawn.pos.createConstructionSite(STRUCTURE_RAMPART);
    //         if (result != OK) {
    //             for (let tower of this._baseOp.towers) {
    //                 result = tower.pos.createConstructionSite(STRUCTURE_RAMPART);
    //                 if (result == OK) break;
    //             }
    //         }
    //     };
    // }

    _tactics() {
        let room = this.baseOp.base;
        let baseOp = this._baseOp;
        let structures = baseOp.myStructures;

        let constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
        let structureSites = constructionSites.filter(o => {return o.structureType != STRUCTURE_ROAD})

        if (baseOp.spawns.length == 0) {
            for (let site of constructionSites) {
                if (site.structureType != STRUCTURE_SPAWN) site.remove();
            }
            if (!_.some(constructionSites,{structureType: STRUCTURE_SPAWN} )) {
                let pos = this._baseOp.centerPos;
                if (pos) {
                    pos = new RoomPosition(pos.x, pos.y+1, pos.roomName)
                    pos.createConstructionSite(STRUCTURE_SPAWN);
                }
                else throw Error('WARNING: Cannot find building spot in room ' + room.name);
            }
        } else if (structureSites.length < 1 ) {
            let createdConstructionSite = false;

            //first try to build the inner core with a fixed template (only if there are enough extentions)
            let viableWorkerCost = (BODYPART_COST[CARRY] + BODYPART_COST[MOVE] + BODYPART_COST[WORK]) * 5 
            let prioritizeExtensions = baseOp.level > 3 && this._baseOp.base.energyCapacityAvailable <  viableWorkerCost
            if (!prioritizeExtensions) {
                let y = this.baseCenter.y - baseCoreOffset.y + 1;
                for(let structureRow of baseCoreTemplate) {
                    y--;
                    let x = this.baseCenter.x + baseCoreOffset.x - 1;
                    for (let structureType of structureRow) {
                        x++
                        let pos = new RoomPosition(x,y, this.baseName);
                        let structures = pos.lookFor(LOOK_STRUCTURES);
                        for (let structure of structures) {
                            if ((  structure.structureType != structureType || structureType == null)
                                && structure.structureType != STRUCTURE_RAMPART
                                && structure.structureType != STRUCTURE_ROAD
                                )  structure.destroy();
                        }
                        if (structureType && !_.some(structures, {structureType: structureType})) {
                            let result = pos.createConstructionSite(structureType);
                            if (result == OK) createdConstructionSite = true;
                        } else if (
                                    ((this.baseCenter.x == x && this.baseCenter.y == y) ||_.some(structures, {structureType: structureType})) 
                                    && !_.some(structures, {structureType: STRUCTURE_RAMPART})
                                ) {
                            let result = pos.createConstructionSite(STRUCTURE_RAMPART);
                            if (result == OK) createdConstructionSite = true;
                        }
                        if (createdConstructionSite) break;
                    }
                    if (createdConstructionSite) break;
                }
            }

            // then expand into the outer region of the base with a generic pattern
            if (!createdConstructionSite) {
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
    }

    /* Find a building spot for a new structure in the base*/ 
    _findBuildingSpot() {
        const CHECK = 20;
        const INVALID = 40;
        let centerPos = this.baseCenter;
        let terrain = Game.map.getRoomTerrain(this.baseOp.name);
        let roomName = this.baseOp.name;

        //first create an array with the terrain.
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

        //start with the base center position and search from there.
        /**@type {RoomPosition[]} */
        let checkSpots = [];
        checkSpots.push(centerPos);

        // search as long as there are possible spots to be checked, until a valid spot has been found
        while(checkSpots.length > 0 && validSpot == undefined) {

            // Create a new list of spots to check from the current list of spots
            /**@type {RoomPosition[]} */
            let newCheckSpots = [];
            for (let checkSpot of checkSpots) {
                let x = checkSpot.x;
                let y = checkSpot.y;
                if (BasePlanOp._isValidBuildingSpot(x,y, this.baseOp)) {
                    // we found a valid spot. return it
                    validSpot = new RoomPosition(x,y, roomName);
                    break;
                }
                else {
                    // current spot is invalid, mark it to prevent checking it again
                    terrainArray[x][y] = INVALID;
                    // add all the spots around this spot to the new check list
                    for (let x_ = x-1; x_ <= x+1; x_++ ) {
                        for (let y_ = y-1; y_<=y+1; y_++) {
                            // only add a spot if it is diagonal from the origin spot and is in the room borders
                            if (x==x_ || y==y_ || x_<0 || x_ > c.MAX_ROOM_SIZE-1 || y_ <0 || y_ > c.MAX_ROOM_SIZE-1) continue;
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
        let centerPos = baseOp.centerPos;
        if (!base.controller) throw Error();
        if (x<2 || x > 47 || y < 2 || y > 47) return false;
        if (x == centerPos.x - 2 && y == centerPos.y) return false // keep space near storage
        if (x == centerPos.x && y == centerPos.y + 2) return false // keep space near spawn
        if (x == centerPos.x + 2 && y == centerPos.y) return false // keep space near link
        if (x == centerPos.x && y == centerPos.y -2) return false // keep space near terminal
        let pos = new RoomPosition(x, y, base.name)
        if (pos.inRangeTo(baseOp.centerPos,CORE_INNER_RADIUS)) return false;
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
        /**@type {StructureSpawn | null} */
        let firstSpawn = null;
        let firstConstructionSite = base.find(FIND_MY_CONSTRUCTION_SITES, {filter: {structureType: STRUCTURE_SPAWN}})[0];
        /**@type {RoomPosition|null} */
        let centerPos = null;
        let terrain = base.getTerrain();

        //find a spawn that is suitable as base center
        //prefer the first spawn, but may not be close to walls.
        for (let spawn of baseOp.spawns) {
            let pos = spawn.pos
            let validSpot = true;
            for (let x=pos.x - CORE_OUTER_RADIUS;x<= pos.x + CORE_OUTER_RADIUS;x++) {
                if (x<0 || x>= c.MAX_ROOM_SIZE) {
                    validSpot = false;
                    break;
                }
                for (let y=pos.y - 1 - CORE_OUTER_RADIUS ; y<= pos.y -1 + CORE_OUTER_RADIUS ;y++){
                    if (y<0 || y>=c.MAX_ROOM_SIZE || terrain.get(x,y) == TERRAIN_MASK_WALL) {
                        validSpot = false;
                        break;
                    }
                }
                if (!validSpot) break;
            }
            if (validSpot) {
                firstSpawn = spawn;
                break;
            }
        }
        
        if (firstSpawn) centerPos = firstSpawn.pos;


        else if (firstConstructionSite) centerPos = firstConstructionSite.pos;
        if (centerPos) {
            return new RoomPosition(centerPos.x, centerPos.y-1, centerPos.roomName);
        }

        let controllerPos = base.controller.pos;
        let sources = base.find(FIND_SOURCES);
        let sourcePos = sources[0].pos;

        //find the center of the path between the sources, otherwise find the first source position
        if (sources.length > 1) {
            let source2Pos = sources[1].pos;
            let path = sourcePos.findPathTo(source2Pos, {range:1, ignoreCreeps:true});
            if (path.length > 1) {
                let pathStep = path[Math.floor(path.length/2)];
                sourcePos = new RoomPosition(pathStep.x, pathStep.y, base.name);
            }
        }

        //now find the center of the path between the previously found position and the controller
        let path = sourcePos.findPathTo(controllerPos, {range:1, ignoreCreeps:true});
        if (path.length < 1) centerPos = sourcePos;
        else {
            let pathStep = path[Math.floor(path.length/2)];
            centerPos = new RoomPosition(pathStep.x, pathStep.y, base.name);
        }

        // now 'flee' from all walls so there is enough free space.
        /**@type {{pos:RoomPosition, range:number }[]} */
        let walls = []
        let roomTerrain = base.getTerrain();
        for(let x=0; x<c.MAX_ROOM_SIZE;x++){
            walls.push({pos: new RoomPosition(x,0, base.name), range:CORE_OUTER_RADIUS+1})
            walls.push({pos: new RoomPosition(x,MAX_ROOM_SIZE-1, base.name), range:CORE_OUTER_RADIUS+1})
            walls.push({pos: new RoomPosition(0, x, base.name), range:CORE_OUTER_RADIUS+1})
            walls.push({pos: new RoomPosition(MAX_ROOM_SIZE-1, x, base.name), range:CORE_OUTER_RADIUS+1})
            for(let y=0; y<c.MAX_ROOM_SIZE;y++){
                if (roomTerrain.get(x,y) == TERRAIN_MASK_WALL) walls.push({pos: new RoomPosition(x,y,base.name), range:CORE_OUTER_RADIUS+1})
            }
        }
        let roomCallBack = function(/**@type {string}*/roomName) {
            if (roomName != base.name) return false;
            let costs = new PathFinder.CostMatrix;
            let room = Game.rooms[roomName]
            let structures = room.find(FIND_STRUCTURES,{filter:o => {return o.structureType!=STRUCTURE_ROAD}});
            for (let structure of structures) {
                let pos = structure.pos
                costs.set(pos.x, pos.y, 255);
            }
            return costs;
        }
        let fleePath = PathFinder.search(centerPos,walls,{flee:true/*, roomCallback: roomCallBack, swampCost:1*/})
        if (fleePath.path.length>0) {
            let path = fleePath.path;
            centerPos = path[path.length-1]
        }
        return centerPos

        // let x = 0;
        // let y = 0;
        // let n = 0;

        // x += base.controller.pos.x;
        // y += base.controller.pos.y;
        // n += 1;

        // for (let source of /**@type {Source[]} */(base.find(FIND_SOURCES))) {
        //     x += source.pos.x;
        //     y += source.pos.y;
        //     n += 1;
        // }

        
        // x = Math.round(x / n);
        // y = Math.round(y / n);

        // let spawnX = x;
        // let spawnY = y;
        // let validSpot;
        // do {
        //     validSpot = true;
        //     spawnX = spawnX + _.random(-1, 1) ;
        //     spawnY = spawnY + _.random(-1, 1) ;
        //     if (spawnX <4 || spawnX > 45) spawnX = 25;
        //     if (spawnY <4 || spawnY > 45) spawnY = 25;

        //     for (let nx=-2;nx<=2;nx++) {
        //         for (let ny=-2;ny<=2;ny++) {
        //             var terrain = roomTerrain.get(spawnX + nx, spawnY + ny);
        //             if (terrain == TERRAIN_MASK_WALL) validSpot = false;
        //         }
        //     }
        // }
        // while (validSpot == false )

        // let result = new RoomPosition(spawnX, spawnY, base.name);
        // return result;
    } 

}
