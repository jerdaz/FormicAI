const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');

/** @typedef {{[roomName:string]: {
 *      lastSeenAttacker:number, 
 *      lastSeenPlayerCreeps:number,
 *      hostileSource:RoomPosition,
 *      lastSeen:number, 
 *      hostileOwner:boolean,
 *      my:boolean
 *      reservation:number,
 *      invasion:boolean,
 *      invasionEnd:number,
 *      hasController: boolean,
 *      safeMode: number|undefined,
 *      activeTowers: number,
 *      sourceCount: number,
 *      level: number
 *      hasRamparts: boolean
 *   }}} RoomInfo*/


/** @typedef {{[roomName:string]: 
 *      {fatigueCost:Number}[][]
 *   }} BreadCrumbs*/

/**@typedef {{roomName:string, dist:number}} BaseDist */

/** @typedef {Array<{
                 exit: ExitConstant;
                room: string;
            }>} RoomPath */

const MIN_ROAD_FATIGUE_COST =   1000 * REPAIR_COST * ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME * CONSTRUCTION_COST_ROAD_SWAMP_RATIO;


module.exports = class MapOp extends ChildOp {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        super(shardOp);
        this._parent = shardOp;
        // /**@type {{[index:string]: BaseDist[]}} */
        // this._baseDist;

        //retrieve roominfo from memory
        /**@type {RoomInfo} */
        this._roomInfo = Memory.roomInfo;
        /**@type {BreadCrumbs} */
        this._breadCrumbs = {};

        /**@type {{[roomA:string]: {[roomB:string]: {path: RoomPath,
                                                     time: number }}}} */
        this._routeCache = {}
    }

    // save roomInfo into memory
    initTick() {
        Memory.roomInfo = this._roomInfo;
    }

    get type() {return c.OPERATION_MAP}
    
    get knownRooms() {
        return this._roomInfo;
    }

    /**@param {String} roomName */
    getBreadCrumbs(roomName) {
        let result = this._breadCrumbs[roomName]
        return result;
    }

    /**
     * @param {String} roomName
     * @param {number} xOffset
     * @param {number} yOffset
     */
    getNeighBour(roomName, xOffset, yOffset){
        let roomCoordinate = this.getRoomCoordinates(roomName);
        if (!roomCoordinate) throw Error ('coordinate error')
        return this.getRoomFromCoordinates(roomCoordinate.x + xOffset, roomCoordinate.y + yOffset)

    }

    /**
     * @param {String} roomName
     */
    getRoomCoordinates(roomName) {
        let result = roomName.match(new RegExp('(?:E([0-9]*)|W([0-9]*))(?:N([0-9]*)|S([0-9]*))'))
        if (!result) return undefined
        let x = 0
        let y = 0
        if (result[1]) x+= Number(result[1]) + 1 // east is positive plus one to prevent double 0's
        if (result[2]) x-= Number(result[2]) // west is negative
        if (result[3]) y+= Number(result[3]) + 1 // north positive and 1
        if (result[4]) y-= Number(result[4])
        return {x: x,
                y: y
            }
    }

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     */
    getRoomFromCoordinates(x, y){
        let roomName = '' 
        if (x>0) roomName += 'E' + String(x - 1);
        else roomName += 'W' + String(x * -1)
        if (y>0) roomName += 'N' + String(y - 1);
        else roomName += 'S' + String(y * -1)
        return roomName;
    }

    /**@param {String} roomName */
    getRoomInfo(roomName) {
        if (this._roomInfo[roomName]) return this._roomInfo[roomName];
        else return null;
    }

    /**
     * @param {String} roomName
     * @param {number} minLevel
     * @param {boolean} hasSpawn
     * @param {number | undefined} lastSeenHostile
     * @returns {String | undefined} */
    findClosestBaseByPath(roomName, minLevel, hasSpawn = false, lastSeenHostile = CREEP_LIFE_TIME, maxDistance = 1000) {
        // if (this._baseDist[roomName]) {
        //     for (let baseDist of this._baseDist[roomName]) {
        //         let base = this._parent.getBase(baseDist.roomName);
        //         if (base.controller.level >= minLevel && (hasSpawn == false || this._parent.getBaseOp(base.name).spawns.length >= 1 )) return base.name;
        //     }
        // } else {
            let closestBase = {roomName: '', dist:10000}
            for (let baseInfo of this._parent.getBaseInfo()) {
                let baseName = baseInfo.name;
                if (!(lastSeenHostile && this._roomInfo[baseName] && (Game.time - this._roomInfo[baseName].lastSeenAttacker || 0 ) < lastSeenHostile)) {
                    let route = this.findRoute(roomName, baseName);
                    let baseOp = this._parent.getBaseOp(baseName)
                    if (route instanceof Array && route.length < closestBase.dist 
                        && route.length <= maxDistance 
                        && (hasSpawn == false || baseOp.spawns.length >= 1 )
                        && baseOp.level >= minLevel
                        ) {
                        closestBase.roomName = baseName;
                        closestBase.dist = route.length;
                    }  
                }
            }
            return closestBase.roomName;
        // }
        // return undefined;
    }

    /**@param {string[]} roomNames
     * @param {string} roomName
     */
    findClosestRoomByPath(roomNames, roomName) {
        /**@type {string|null} */
        let closestRoom = null
        let closestDistance = 99999;
        for(let roomNameA of roomNames) {
            let route = this.findRoute(roomNameA, roomName);
            if (route instanceof Array) {
                let distance = route.length
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestRoom = roomNameA;
                }
            }
        }
        return closestRoom
    }

    // /** @param {Map<string,BaseOp>} baseOpsMap*/
    // updateBaseDistances(baseOpsMap) {
    //     this._baseDist = {};
    //     let baseNames = [];
    //     for(let baseOpKey of baseOpsMap) {
    //         let baseName = baseOpKey[0];
    //         this._baseDist[baseName] = [];
    //         baseNames.push(baseName);
    //     }
    //     for(let i=0; i <baseNames.length;i++) {
    //         let baseAName = baseNames[i];
    //         for(let j=i+1; j < baseNames.length;j++){
    //             let baseBName = baseNames[j]
    //             let path = this.findRoute(baseAName, baseBName)
    //             if (path.length > 0) { 
    //                 this._baseDist[baseAName].push( {roomName:baseBName, dist: path.length })
    //                 this._baseDist[baseBName].push( {roomName:baseAName, dist: path.length })
    //             }
    //         }
    //         this._baseDist[baseAName].sort((a,b) => {
    //             if (a.dist < b.dist) return -1;
    //             else if (a.dist > b.dist) return 1;
    //             else return 0;
    //         })
    //     }
    // }

    /**@param {String} roomName */
    findClosestPortalRoom(roomName){
        let ew = (roomName.match('E|W')||[''])[0];
        let x = parseInt((roomName.match('[0-9]+')||[''])[0]);
        let ns = (roomName.match('N|S')||[''])[0];
        let y = parseInt((roomName.match('[0-9]+$')||[''])[0]);
        x = Math.round(x/10) * 10;
        y = Math.round (y/10) * 10;
        if (!ew || !ns) throw Error();
        return ew + x + ns + y;
    }

    /**@param {String} roomName */
    describeExits(roomName) {
        return Game.map.describeExits(roomName);
    }    

    /**@param {string} from
     * @param {string} to
     */
    findRoute(from, to) {
        //retrieve path from cache
        /**@type {RoomPath} */
        let result = [];
        if (this._routeCache[from] && this._routeCache[from][to] && this._routeCache[from][to].time > Game.time - c.SUPPORT_INTERVAL) {
            result = this._routeCache[from][to].path;
        } else {
            let result2 = Game.map.findRoute(from, to, {routeCallback: (roomName, fromRoomName) => 
                {   let roomInfo = this.getRoomInfo(roomName);
                    //if(roomInfo && roomInfo.hostileOwner) return Infinity; 
                    if (roomInfo && (/**roomInfo.lastSeenHostile  + CREEP_LIFE_TIME >= Game.time  ||*/ roomInfo.activeTowers >= 1)) return Infinity;
                }
                })
            if (result2 == -2) result = [];
            else result = result2;
            if (!this._routeCache[from]) this._routeCache[from] = {};
            if (!this._routeCache[from][to]) this._routeCache[to] = {};
            this._routeCache[from][to] = {path:result, time:Game.time}
        }
        return result;
    }


    /**@param {RoomPosition} pos
     * @param {Number} cost
     */
    registerFatigue(pos, cost) {
        let breadCrumbs = this._breadCrumbs[pos.roomName];
        if (!breadCrumbs) return;
        breadCrumbs[pos.x][pos.y].fatigueCost += cost;
    }


    _updateRoadMatrices() {
        //subtract road cost from road opportunity cost matrixes
        for (let roomName in this._breadCrumbs) {
            let terrainArray = this._breadCrumbs[roomName];
            let roomTerrain = Game.map.getRoomTerrain(roomName);
            for (let x=0;x<50;x++) {
                for (let y=0;y<50;y++) {
                    let terrain = roomTerrain.get(x,y)
                    let repairCost = c.TACTICS_INTERVAL * REPAIR_COST * ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME;
                    if (terrain == TERRAIN_MASK_SWAMP) repairCost *= CONSTRUCTION_COST_ROAD_SWAMP_RATIO;
                    if (terrain == TERRAIN_MASK_WALL) repairCost *= CONSTRUCTION_COST_ROAD_WALL_RATIO;
                    let decayFactor = 1;
                    if (terrainArray[x][y].fatigueCost > 0 ) decayFactor = 0.99
                    terrainArray[x][y].fatigueCost = Math.max(-1 * MIN_ROAD_FATIGUE_COST, terrainArray[x][y].fatigueCost * decayFactor - repairCost);
                }
            }
        }
    }

    _tactics() {
        this._updateRoadMatrices();
    }
  
   _command() {
        for(let roomName in Game.rooms) {
            // initialize roominfo en breadcrumb objects for new rooms
            if (this._roomInfo[roomName] == undefined) {
                this._roomInfo[roomName] = {lastSeenPlayerCreeps: 0, lastSeenAttacker:0, hostileSource: new RoomPosition(25,25,roomName), lastSeen:0, hostileOwner:false, my:false, hasController:false, level:0, reservation:0, invasion:false, invasionEnd:0, safeMode:undefined, activeTowers:0, sourceCount:0, hasRamparts: false}
            }
            if (this._breadCrumbs[roomName] == undefined) {
                this._breadCrumbs[roomName] = []
                let terrainArray = this._breadCrumbs[roomName]
                for (let x=0; x<c.MAX_ROOM_SIZE;x++) {
                    terrainArray[x] = [];
                    for (let y=0; y<c.MAX_ROOM_SIZE;y++) {
                        terrainArray[x][y] = {fatigueCost : -1 *  MIN_ROAD_FATIGUE_COST};
                    }
                }
            }

            let room = Game.rooms[roomName];
            let hostiles = room.find(FIND_HOSTILE_CREEPS);
            if (hostiles.length>0) {
                let hostileFound = false;
                let otherPlayerFound = false;
                for (let hostile of hostiles) {
                    if (hostile.owner.username == c.INVADER_USERNAME) {
                        this._roomInfo[roomName].invasion = true;
                        this._roomInfo[roomName].invasionEnd = Game.time + (hostile.ticksToLive||0);
                    } else if (hostile.owner.username != 'Source Keeper') {
                        otherPlayerFound = true;
                        if (hostile.getActiveBodyparts(ATTACK) > 0 || hostile.getActiveBodyparts(RANGED_ATTACK)> 0 /*|| hostile.getActiveBodyparts(WORK)>0*/) hostileFound = true;
                    }
                    if (otherPlayerFound) {
                        this._roomInfo[roomName].lastSeenPlayerCreeps = Game.time;
                    }
                    if (hostileFound) {
                        // if there weren't hostiles the previous turn update the hostile source locations
                        if (this._roomInfo[roomName].lastSeenAttacker < this._roomInfo[roomName].lastSeen) this._roomInfo[roomName].hostileSource = hostile.pos;
                        this._roomInfo[roomName].lastSeenAttacker = Game.time;
                        break;
                    }

                }
            } else this._roomInfo[roomName].invasion = false;
            this._roomInfo[roomName].lastSeen = Game.time;
            this._roomInfo[roomName].hostileOwner = room.controller != undefined && (   (room.controller.reservation && room.controller.reservation.username != this._parent.userName) 
                                                                                     || (!room.controller.my && (room.controller.owner != null ))
                                                                                    );
            this._roomInfo[roomName].sourceCount = room.find(FIND_SOURCES).length;
            if (room.controller) {
                this._roomInfo[roomName].hasController = true;
                this._roomInfo[roomName].level = room.controller.level
                this._roomInfo[roomName].safeMode = room.controller.safeMode
                this._roomInfo[roomName].reservation = room.controller.reservation?room.controller.reservation.ticksToEnd:0;
                this._roomInfo[roomName].my = (room.controller.reservation && room.controller.reservation.username == this._parent.userName) || room.controller.my;
            } else {
                this._roomInfo[roomName].hasController= false;
                this._roomInfo[roomName].level = 0;
                this._roomInfo[roomName].safeMode = undefined;
                this._roomInfo[roomName].my = false;
            }
            this._roomInfo[roomName].activeTowers = _.size (room.find(FIND_HOSTILE_STRUCTURES, {filter: o => {return o.structureType == STRUCTURE_TOWER && (o.isActive()||o.owner.username == 'Invader') && o.store.getUsedCapacity(RESOURCE_ENERGY) >= TOWER_ENERGY_COST}}))
            this._roomInfo[roomName].hasRamparts = room.find(FIND_HOSTILE_STRUCTURES).find(structure => structure.structureType == STRUCTURE_RAMPART) != null
        }
    }
}

