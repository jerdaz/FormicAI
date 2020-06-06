const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');

/** @typedef {{[roomName:string]: {
 *      terrainArray:{fatigueCost:Number}[][], 
 *      lastSeenHostile:number, 
 *      lastSeen:number, 
 *      hostileOwner:boolean,
 *      hasController: boolean,
 *      level: number
 *   }}} RoomInfo*/
/**@typedef {{roomName:string, dist:number}} BaseDist */

const MIN_ROAD_FATIGUE_COST =   1000 * REPAIR_COST * ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME * CONSTRUCTION_COST_ROAD_SWAMP_RATIO;

module.exports = class MapOp extends ChildOp {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        super(shardOp);
        this._parent = shardOp;
        /**@type {{[index:string]: BaseDist[]}} */
        this._baseDist;
        /**@type {RoomInfo} */
        this._roomInfo = {};
    }

    get type() {return c.OPERATION_MAP}
    
    get knownRooms() {
        return this._roomInfo;
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
    findClosestBaseByPath(roomName, minLevel, hasSpawn = false, lastSeenHostile = 0) {
        if (this._baseDist[roomName]) {
            for (let baseDist of this._baseDist[roomName]) {
                let base = this._parent.getBase(baseDist.roomName);
                if (base.controller.level >= minLevel && (hasSpawn == false || this._parent.getBaseOp(base.name).spawns.length >= 1 )) return base.name;
            }
        } else {
            let closestBase = {roomName: '', dist:10000}
            for (let baseName in this._baseDist) {

                if (!(lastSeenHostile && this._roomInfo[baseName] && (Game.time - this._roomInfo[baseName].lastSeenHostile || 0 ) < lastSeenHostile)) {
                    let route = Game.map.findRoute(roomName, baseName);
                    if (route instanceof Array && route.length < closestBase.dist) {
                        closestBase.roomName = baseName;
                        closestBase.dist = route.length;
                    }  
                }
            }
            return closestBase.roomName;
        }
        return undefined;
    }

    /** @param {Map<string,BaseOp>} baseOpsMap*/
    updateBaseDistances(baseOpsMap) {
        this._baseDist = {};
        let baseNames = [];
        for(let baseOpKey of baseOpsMap) {
            let baseName = baseOpKey[0];
            this._baseDist[baseName] = [];
            baseNames.push(baseName);
        }
        for(let i=0; i <baseNames.length;i++) {
            let baseAName = baseNames[i];
            for(let j=i+1; j < baseNames.length;j++){
                let baseBName = baseNames[j]
                let dist = Game.map.findRoute(baseAName, baseBName)
                if (dist != ERR_NO_PATH) { 
                    this._baseDist[baseAName].push( {roomName:baseBName, dist: dist.length })
                    this._baseDist[baseBName].push( {roomName:baseAName, dist: dist.length })
                }
            }
            this._baseDist[baseAName].sort((a,b) => {
                if (a.dist < b.dist) return -1;
                else if (a.dist > b.dist) return 1;
                else return 0;
            })
        }
    }

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
        let result = Game.map.findRoute(from, to, {routeCallback: (roomName, fromRoomName) => 
            {   let roomInfo = this.getRoomInfo(roomName);
                if(roomInfo && roomInfo.hostileOwner) return Infinity; }
            })
        return result;
    }


    /**@param {RoomPosition} pos
     * @param {Number} cost
     */
    registerFatigue(pos, cost) {
        let roomInfo = this.getRoomInfo(pos.roomName);
        if (!roomInfo) return;
        roomInfo.terrainArray[pos.x][pos.y].fatigueCost += cost;
    }


    _updateRoadMatrices() {
        //subtract road cost from road opportunity cost matrixes
        for (let roomName in this._roomInfo) {
            let roomInfo = this._roomInfo[roomName];
            let roomTerrain = Game.map.getRoomTerrain(roomName);
            for (let x=0;x<50;x++) {
                for (let y=0;y<50;y++) {
                    let terrain = roomTerrain.get(x,y)
                    let repairCost = c.TACTICS_INTERVAL * REPAIR_COST * ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME;
                    if (terrain == TERRAIN_MASK_SWAMP) repairCost *= CONSTRUCTION_COST_ROAD_SWAMP_RATIO;
                    if (terrain == TERRAIN_MASK_WALL) repairCost *= CONSTRUCTION_COST_ROAD_WALL_RATIO;
                    roomInfo.terrainArray[x][y].fatigueCost = Math.min(50*MIN_ROAD_FATIGUE_COST, Math.max(-1 * MIN_ROAD_FATIGUE_COST, roomInfo.terrainArray[x][y].fatigueCost -repairCost));
                }
            }
        }
    }

    _tactics() {
        this._updateRoadMatrices();

        for(let roomName in Game.rooms) {
            if (this._roomInfo[roomName] == undefined) {
                this._roomInfo[roomName] = {terrainArray: [], lastSeenHostile:0, lastSeen:0, hostileOwner:false, hasController:false, level:0}
                for (let x=0; x<c.MAX_ROOM_SIZE;x++) {
                    this._roomInfo[roomName].terrainArray[x] = [];
                    for (let y=0; y<c.MAX_ROOM_SIZE;y++) {
                        this._roomInfo[roomName].terrainArray[x][y] = {fatigueCost : -1*  MIN_ROAD_FATIGUE_COST};
                    }
                }
            }
            let room = Game.rooms[roomName];
            let hostiles = room.find(FIND_HOSTILE_CREEPS);
            if (hostiles.length>0) this._roomInfo[roomName].lastSeenHostile = Game.time;
            this._roomInfo[roomName].lastSeen = Game.time;
            this._roomInfo[roomName].hostileOwner = room.controller != undefined && !room.controller.my && (room.controller.owner != null || room.controller.reservation != undefined);
            if (room.controller) {
                this._roomInfo[roomName].hasController = true;
                this._roomInfo[roomName].level = room.controller.level
            } else {
                this._roomInfo[roomName].hasController= false;
                this._roomInfo[roomName].level = 0;
            }
        }
    }
}

