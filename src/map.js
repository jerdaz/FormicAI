let U = require('./util');
let c = require('./constants');
let BaseOp = require('./baseOp');
/** @typedef {import('./shardOp')} ShardOp */

module.exports = class Map {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        this._shardOp = shardOp
        /**@type {{[roomName:string]:{roomName:string, dist:number}[]}} */
        this._baseDist;
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

    /**@param {String} roomName */
    findClosestPortalRoom(roomName){
        let ew = roomName.slice(1);
        let x = parseInt(roomName);
        let ns = roomName.match('(N|S)');
        let y = parseInt(roomName.slice(-2));
        x = Math.round(x/10) * 10;
        y = Math.round (y/10) * 10;
        return ew + x + ns + y;
    }

    /**@param {String} roomName */
    describeExits(roomName) {
        return Game.map.describeExits(roomName);
    }
}