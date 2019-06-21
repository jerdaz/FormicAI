let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
/**@typedef {import('./baseOp')} BaseOp  */

/**@type {{[body:string]:number}} */
const BODY_SORT = {'tough': 1, 'move': 2, 'carry': 3, 'work': 4 , 'claim': 5, 'attack': 6, 'ranged_attack': 7, 'heal': 8};

module.exports = class SpawnOp extends Operation {
    /**@param {StructureSpawn[]} spawns */
    /**@param {BaseOp} baseOp */
    constructor(spawns, baseOp) {
        super();
        this._spawns = spawns;
        /**@type {BaseOp} */
        this._baseOp = baseOp;
        /**@type {{count:number}[]} */
        this._spawnRequests = [];

        /**@type {number[]} */
        this._spawnPrio = [];
    }

    /**@param {StructureSpawn[]} spawns */
    initTick(spawns) {
        this._spawns = spawns;
    }

    /**@param {number} opType */
    /**@param {number} count */
    ltRequestSpawn(opType, count) {
        this._spawnRequests[opType] = {count:count};
    }

    _strategy() {
        if(this._spawnPrio.length == 0) {
            this._spawnPrio[c.OPERATION_FILLING] = 100;
            this._spawnPrio[c.OPERATION_BUILDING] = 20;
            this._spawnPrio[c.OPERATION_UPGRADING] = 10;
        }
    }

    _command() {
        let canSpawn = false;
        for (let spawn of this._spawns) if (spawn.spawning != null) canSpawn = true;
        if (canSpawn) {
            let spawnList = this._getSpawnList();
            if (spawnList.length > 0 ) {
                for (let spawn of this._spawns) {
                    if (spawn.spawning == null) {
                        let body = this._expandCreep([MOVE,CARRY,WORK]);
                        let spawnItem = spawnList.pop();
                        if (spawnItem) {
                            let result = spawn.spawnCreep(body, spawn.room.name + '_' + spawnItem.opType + '_' + _.random(0, 999999999))
                            if (result != OK) spawnList.push(spawnItem);
                        }
                    }
                }
            }
        }
    }

    _getSpawnList() {
        let base = this._baseOp.getBase();
        /**@type {{prio:number, opType:number}[]} */
        let spawnList = []
        let spawnRequests = this._spawnRequests;

        for (let opType; opType = 1; opType++){
            let spawnRequest = spawnRequests[opType];
            if (spawnRequest) {
                let creeps = this._baseOp.getSubTeamOp(opType).getCreepCount();
                let nCreeps = creeps.count;
                if (spawnRequest.count > nCreeps) {
                    spawnList.push ({prio: (spawnRequest.count - nCreeps) * this._spawnPrio[opType], opType: opType})
                }
            }
        }

        spawnList.sort((a, b) => {  if (a.prio < b.prio) return -1;
                                    if (a.prio > b.prio) return 1;
                                    return 0;
                                 });
        return spawnList;
    }


    /**@param {BodyPartConstant[]} body */
    _expandCreep (body, minLength = 3, maxLength = MAX_CREEP_SIZE) {
        /**@type {BodyPartConstant[]} */
        var result = [];
        var i=0;
        var maxEnergy = this._baseOp.getMaxSpawnEnergy();
        while (_getCreepCost(result) <= maxEnergy && result.length < Math.min(maxLength + 1, MAX_CREEP_SIZE + 1)) {
            result.push(body[i++]);
            i = i % body.length;
        }
        result.pop(); // de laatste er altijd uitgooien omdat die energie overschrijdt
        result.sort((/**@type {string} */partA, /**@type {string} */ partB) => {
            if (BODY_SORT[partA] < BODY_SORT[partB]) return -1;
            if (BODY_SORT[partA] > BODY_SORT[partB]) return 1;
            return 0;
        });
    
        if (result.length>= minLength) return result;
        else return [];

        /**@param {BodyPartConstant[]} body */
        function _getCreepCost (body) {
            var cost = 0;
            for (var i=0; i<body.length;i++) cost += BODYPART_COST[body[i]];
            return cost;
        }
    }
}
