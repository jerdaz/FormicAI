const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');

/** @typedef {{[roomName:string]: {lastSeenHostile:number, lastSeen:number, hostileOwner:boolean}}} ScoutInfo*/
/**@typedef {{roomName:string, dist:number}} BaseDist */

module.exports = class MapOp extends ChildOp {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        super(shardOp);
        this._parent = shardOp;
        /**@type {{[index:string]: BaseDist[]}} */
        this._baseDist;
        /**@type {ScoutInfo} */
        this._scoutInfo = {};
    }

    get type() {return c.OPERATION_MAP}

    /**@param {String} roomName */
    getLastHostile(roomName) {
        if (this._scoutInfo[roomName]) return this._scoutInfo[roomName].lastSeenHostile;
        else return 0;
    }

    /**@param {String} roomName */
    getLastSeen(roomName) {
        if (this._scoutInfo[roomName]) return this._scoutInfo[roomName].lastSeen;
        else return 0;
    }

    /**@param {String} roomName */
    getHostileOwner(roomName) {
        if (this._scoutInfo[roomName]) return this._scoutInfo[roomName].hostileOwner;
        else return false;
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

                if (!(lastSeenHostile && this._scoutInfo[baseName] && (Game.time - this._scoutInfo[baseName].lastSeenHostile || 0 ) < lastSeenHostile)) {
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

    _tactics() {
        for(let roomName in Game.rooms) {
            if (this._scoutInfo[roomName] == undefined) this._scoutInfo[roomName] = {lastSeenHostile:0, lastSeen:0, hostileOwner:false}
            let room = Game.rooms[roomName];
            let hostiles = room.find(FIND_HOSTILE_CREEPS);
            if (hostiles.length>0) this._scoutInfo[roomName].lastSeenHostile = Game.time;
            this._scoutInfo[roomName].lastSeen = Game.time;
            this._scoutInfo[roomName].hostileOwner = room.controller != undefined && !room.controller.my && room.controller.owner != null;
        }
    }


}

