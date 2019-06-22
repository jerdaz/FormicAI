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
    /**@returns {String | undefined} */
    findClosestBaseByPath(roomName, minLevel) {
        for (let baseDist of this._baseDist[roomName]) {
            let base = this._shardOp.getBase(baseDist.roomName);
            if (base.controller.level >= minLevel) return base.name;
        }
        return undefined;
    }

    /** @param {{[key:string]: BaseOp }} baseOps*/
    updateBaseDistances(baseOps) {
        this._baseDist = {};
        for(let baseAName in baseOps) {
            this._baseDist[baseAName] = [];
            for( let baseBName in baseOps) {
                this._baseDist[baseAName].push( {roomName:baseBName, dist: _.size(Game.map.findRoute(baseAName, baseBName))})
            }
            this._baseDist[baseAName].sort((a,b) => {
                if (a.dist < b.dist) return -1;
                else if (a.dist > b.dist) return 1;
                else return 0;
            })
        }
    }
}