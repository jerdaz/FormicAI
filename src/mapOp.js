let U = require('./util');
let c = require('./constants');
let BaseOp = require('./baseOp');
/** @typedef {import('./shardOp')} ShardOp */

/** @typedef {{[roomName:string]: {lastSeenHostile:number}}} ScoutInfo*/

module.exports = class MapOp {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        this._shardOp = shardOp
        /**@type {{[roomName:string]:{roomName:string, dist:number}[]}} */
        this._baseDist;
        /**@type {ScoutInfo} */
        this._scoutInfo = {};
    }

    _strategy() {
        if (U.chance(10)) {
            let baseOps = this._shardOp.getBaseOps();
            for(let roomName in Game.rooms) {
                let room = Game.rooms[roomName];
                let hostiles = room.find(FIND_HOSTILE_CREEPS);
                if (hostiles) this._scoutInfo[roomName].lastSeenHostile = Game.time;
            }
        }
    }

    /**@param {String} roomName */
    getLastHostile(roomName) {
        if (this._scoutInfo[roomName]) return this._scoutInfo[roomName].lastSeenHostile;
        else return undefined;
    }

    /**@param {String} roomName */
    /**@param {number} minLevel */
    /**@param {boolean} hasSpawn */
    /**@returns {String | undefined} */
    findClosestBaseByPath(roomName, minLevel, hasSpawn = false) {
        for (let baseDist of this._baseDist[roomName]) {
            let base = this._shardOp.getBase(baseDist.roomName);
            if (base.controller.level >= minLevel && (hasSpawn == false || this._shardOp.getBaseOp(base.name).hasSpawn() )) return base.name;
        }
        return undefined;
    }

    /** @param {{[key:string]: BaseOp }} baseOps*/
    updateBaseDistances(baseOps) {
        this._baseDist = {};
        for(let baseAName in baseOps) {
            this._baseDist[baseAName] = [];
            for( let baseBName in baseOps) {
                let dist = Game.map.findRoute(baseAName, baseBName)
                if (dist != ERR_NO_PATH) this._baseDist[baseAName].push( {roomName:baseBName, dist: dist.length })
            }
            this._baseDist[baseAName].sort((a,b) => {
                if (a.dist < b.dist) return -1;
                else if (a.dist > b.dist) return 1;
                else return 0;
            })
        }
    }
}
