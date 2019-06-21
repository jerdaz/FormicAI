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
    }

    /**@param {StructureSpawn[]} spawns */
    initTick(spawns) {
        this._spawns = spawns;
    }

    _command() {
        let spawns = this._spawns;
        let command = this._baseOp.getSpawnCommand();
        let role = command;
        if (command != c.ROLE_NONE) {
            let body = this._expandCreep([MOVE,CARRY,WORK]);
            spawns[0].spawnCreep(body, spawns[0].room.name + '_' + role + '_' + _.random(0, 999999999))
        }
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
