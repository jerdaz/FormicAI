let U = require('./util');
const c = require('./constants');
let _ = require('lodash');
let Operation = require('./operation');
let BaseOp = require ('./BaseOp');

/**@type {{[body:string]:number}} */
const BODY_SORT = {'tough': 1, 'move': 2, 'carry': 3, 'work': 4 , 'claim': 5, 'attack': 6, 'ranged_attack': 7, 'heal': 8};

module.exports = class SpawnOp extends Operation {
    /**@param {StructureSpawn} spawn */
    /**@param {BaseOp} baseOp */
    constructor(spawn, baseOp) {
        super();
        this._spawn = spawn;
        /**@type {BaseOp} */
        this._baseOp = baseOp;
    }

    /**@param {StructureSpawn} spawn */
    initTick(spawn) {
        this._spawn = spawn;
    }

    _command() {
        let spawn = this._spawn;
        let command = this._baseOp.getSpawnCommand();
        let role = command;
        if (command != c.ROLE_NONE) {
            let capacity = spawn.room.energyCapacityAvailable;
            let bodySize = Math.floor(capacity / 200);
            
            let body = this._expandCreep([WORK,MOVE,CARRY]);

            spawn.spawnCreep(body, spawn.room.name + '_' + role + '_' + _.random(0, 999999999))
        }
    }

    /**@param {string[]} body */
    _expandCreep (body, minLength = 3, maxLength = MAX_CREEP_SIZE) {
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

        /**@param {string[]} body */
        function _getCreepCost (body) {
            var cost = 0;
            for (var i=0; i<body.length;i++) cost += BODYPART_COST[body[i]];
            return cost;
        }
    }
}
