let U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const MAX_HITS_REPAIR_PER_LEVEL = 10000

module.exports = class TowerOp extends BaseChildOp {
    get type() { return c.OPERATION_TOWER; }

    _command() {
        let hostiles = this._baseOp.base.find(FIND_HOSTILE_CREEPS);
        let base = this._baseOp.base;
        let towers = this._baseOp.towers;
        let creepsHit = base.find(FIND_MY_CREEPS, {filter: (creep) => {return (creep.hits < creep.hitsMax );}} );
        let structuresHit = base.find(FIND_STRUCTURES, {filter: (structure) => {return (structure.hits < structure.hitsMax - TOWER_POWER_REPAIR && structure.hits < MAX_HITS_REPAIR_PER_LEVEL * base.controller.level && structure.structureType!= STRUCTURE_ROAD)}});
        for (let tower of towers) {
            if (hostiles.length > 0) {
                let hostile = tower.pos.findClosestByRange(hostiles);
                if (!hostile) throw Error();
                if (hostile.owner.username == c.INVADER_USERNAME || tower.pos.getRangeTo(hostile.pos) <= 5) tower.attack(hostile);
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

        if (hostiles.length>0) {
            for (let event of this.baseOp.events) {
                let activateSafeMode = false;
                if (event.event == EVENT_ATTACK_CONTROLLER) activateSafeMode = true;
                else if (event.event == EVENT_ATTACK && event.data.damage > 0) {
                    let object = Game.getObjectById(event.data.targetId);
                    if (object && object.structureType && object.my) {
                        let structureType = object.structureType;
                        switch (structureType) {
                            case STRUCTURE_WALL:
                            case STRUCTURE_RAMPART:
                                break;
                            default:
                                activateSafeMode = true;
                        }
                    } 
                    else if (object && object instanceof Creep && this._baseOp.spawns.length == 0) activateSafeMode = true;
                }
                if (activateSafeMode) {
                    this.baseOp.activateSafemode();
                    break;
                }
            }
        }
    }

    // /**@returns {Creep | undefined} */
    // _getInvader() {
    //     var invaders = _.filter(this._baseOp.base.find(FIND_HOSTILE_CREEPS),invader => {
    //         //don't attack invaders on transition tiles to prevent simple drain tactics
    //         if (invader.owner.username == c.INVADER_USERNAME) return true;
    //         let pos = invader.pos;
    //         if (pos.x == 0 || pos.y == 0 || pos.x == c.MAX_ROOM_SIZE - 1 || pos.y == c.MAX_ROOM_SIZE - 1) return false;
    //         return true;
    //     });
    //     var target = invaders[0];
    //     var targetHealParts = 0;
    //     for (var invader of invaders) {
    //         var body = invader.body;
    //         var healParts = 0;
    //         for (var bodyPart of body) if(bodyPart.type == HEAL) healParts++;
    //         if (healParts < targetHealParts) {
    //             target = invader;
    //             targetHealParts = healParts;
    //         }
    //     }
    //     return target;
    // }
}

