let U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseOp').BaseChildOp;
const BaseOp = require('./baseOp').BaseOp;

const MAX_HITS_REPAIR_PER_LEVEL = 10000

class TowerOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {StructureTower[]} */
        this._towers = [];
    }

    get type() { return c.OPERATION_TOWER; }


    initTick() {
        this._towers = /**@type {StructureTower[]}*/ (this._baseOp.getMyStructures(STRUCTURE_TOWER));
    }

    _command() {
        let hostile = this._getInvader();
        let room = this._baseOp.getBase();
        var creepsHit = room.find(FIND_MY_CREEPS, {filter: (creep) => {return (creep.hits < creep.hitsMax );}} );
        var structuresHit = room.find(FIND_STRUCTURES, {filter: (structure) => {return (structure.hits < structure.hitsMax - TOWER_POWER_REPAIR && structure.hits < MAX_HITS_REPAIR_PER_LEVEL * this._baseOp.getLevel())}});
        for (let tower of this._towers) {
            if (hostile) {
                tower.attack(hostile);
                continue;
            }
            if (creepsHit.length>0) {
                let creep = tower.pos.findClosestByRange(creepsHit)
                if (creep) tower.heal(creep);
                continue;
            }
            if (structuresHit.length>0) {
                var target = structuresHit[0];
                for(var i = 1;i<structuresHit.length;i++) if (target.hits > structuresHit[i].hits) target = structuresHit[i];
                tower.repair(target);
                continue;
            }        
        }
    }

    /**@returns {Creep | undefined} */
    _getInvader() {
        var invaders = this._baseOp.getBase().find(FIND_HOSTILE_CREEPS);
        var target = invaders[0];
        var targetHealParts = 0;
        for (var invader of invaders) {
            var body = invader.body;
            var healParts = 0;
            for (var bodyPart of body) if(bodyPart.type == HEAL) healParts++;
            if (healParts < targetHealParts) {
                target = invader;
                targetHealParts = healParts;
            }
        }
        return target;
    }
}

module.exports.TowerOp = TowerOp;
