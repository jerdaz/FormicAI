let U = require('./util');
let c = require('./constants');
/** @typedef {import('./shardOp')} ShardOp */
/** @typedef {import('./baseOp')} BaseOp */

/**@typedef {{roomName:string, dist:number}} BaseDist */
module.exports = class Map {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        this._shardOp = shardOp
        /**@type {{[index:string]: BaseDist[]}} */
        this._baseDist;
    }

    /**@param {String} roomName */
    /**@param {number} minLevel */
    /**@param {boolean} hasSpawn */
    /**@returns {String | undefined} */
    findClosestBaseByPath(roomName, minLevel, hasSpawn = false) {
        if (this._baseDist[roomName]) {
            for (let baseDist of this._baseDist[roomName]) {
                let base = this._shardOp.getBase(baseDist.roomName);
                if (base.controller.level >= minLevel && (hasSpawn == false || this._shardOp.getBaseOp(base.name).hasSpawn() )) return base.name;
            }
        } else {
            let closestBase = {roomName: '', dist:10000}
            for (let baseName in this._baseDist) {
                let route = Game.map.findRoute(roomName, baseName);
                if (route instanceof Array && route.length < closestBase.dist) {
                    closestBase.roomName = baseName;
                    closestBase.dist = route.length;
                }  
            }
            return closestBase.roomName;
        }
        return undefined;
    }

    /** @param {{[key:string]: BaseOp }} baseOps*/
    updateBaseDistances(baseOps) {
        this._baseDist = {};
        let baseNames = [];
        for(let baseName in baseOps) {
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
}
