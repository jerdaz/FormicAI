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
        /**@type {{count:number, template:CreepTemplate}[]} */
        this._spawnRequests = [];
        this._builderRequest = '';

        /**@type {number[]} */
        this._spawnPrio = [];
    }

    /**@param {StructureSpawn[]} spawns */
    initTick(spawns) {
        this._spawns = spawns;
    }

    /**@param {number} opType */
    /**@param {CreepTemplate} template */
    /**@param {number} count */
    ltRequestSpawn(opType, template, count) {
        this._spawnRequests[opType] = {count:count, template: template};
    }

    /**@param {string} roomName */
    requestBuilder(roomName) {
        this._builderRequest = roomName;
    }

    _strategy() {
        if(this._spawnPrio.length == 0) {
            this._spawnPrio[c.OPERATION_FILLING] = 100;
            this._spawnPrio[c.OPERATION_BUILDING] = 20;
            this._spawnPrio[c.OPERATION_UPGRADING] = 10;
            this._spawnPrio[c.OPERATION_COLONIZING] = 10;
        }
    }

    _command() {
        let canSpawn = false;
        for (let spawn of this._spawns) if (spawn.spawning == null) canSpawn = true;
        if (canSpawn) {
            if (this._builderRequest && this._baseOp.getSubTeamOp(c.OPERATION_FILLING).getCreepCount() >= 1) {
                let body = this._expandCreep({body:[WORK,MOVE,CARRY]});
                let roomName = this._builderRequest
                for (let spawn of this._spawns) {
                    let result = spawn.spawnCreep(body, roomName + '_' + c.OPERATION_BUILDING + '_' + _.random(0, 999999999))
                    if (result != OK) this._builderRequest = '';
                }
            } else {
                let spawnList = this._getSpawnList();
                if (spawnList.length > 0 ) {
                    for (let spawn of this._spawns) {
                        if (spawn.spawning == null) {
                            let spawnItem = spawnList.pop();
                            if (spawnItem) {
                                let body = this._expandCreep(spawnItem.template);
                                let result = spawn.spawnCreep(body, spawn.room.name + '_' + spawnItem.opType + '_' + _.random(0, 999999999))
                                if (result != OK) spawnList.push(spawnItem);
                            }
                        }
                    }
                }
            }
        }
    }

    _getSpawnList() {
        let base = this._baseOp.getBase();
        /**@type {{prio:number, opType:number, template:CreepTemplate}[]} */
        let spawnList = []
        let spawnRequests = this._spawnRequests;

        for (let opType = 1; opType <= c.OPERATION_MAX; opType++){
            let spawnRequest = spawnRequests[opType];
            if (spawnRequest) {
                let teamOp = this._baseOp.getSubTeamOp(opType);
                let nCreeps = 0;
                if (teamOp) nCreeps = teamOp.getCreepCount();
                if (spawnRequest.count > nCreeps) {
                    spawnList.push ({prio: (spawnRequest.count - nCreeps) / spawnRequest.count * this._spawnPrio[opType], opType: opType, template:spawnRequest.template})
                }
            }
        }

        spawnList.sort((a, b) => {  if (a.prio < b.prio) return -1;
                                    if (a.prio > b.prio) return 1;
                                    return 0;
                                 });
        return spawnList;
    }


    /**@param {CreepTemplate} template */
    _expandCreep (template) {
        /**@type {BodyPartConstant[]} */
        let body = template.body;
        let minLength = template.minLength;
        let maxLength = template.maxLength;
        if (!minLength) minLength = 3
        if (!maxLength || maxLength > MAX_CREEP_SIZE) maxLength = MAX_CREEP_SIZE;

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
