let U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const MAX_HITS_REPAIR_PER_LEVEL = 10000 // maximum hits per level repaired by towers

module.exports = class TowerOp extends BaseChildOp {
    get type() { return c.OPERATION_DEFENSE; }

    _tactics() {
        let nCreep = 0
        if (_.filter(this._baseOp.towers, o => {return o.isActive()}) && this._baseOp.base.find(FIND_HOSTILE_CREEPS).length>0) {
            nCreep = 1;
        }
        this._baseOp.spawningOp.ltRequestSpawn(this,{body:[MOVE,ATTACK] }, nCreep)

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            creepOp.instructAttack(this._baseName);
        }
    }

    _command() {
        let hostiles = this._baseOp.base.find(FIND_HOSTILE_CREEPS);
        let base = this._baseOp.base;
        let towers = this._baseOp.towers;
        let creepsHit = base.find(FIND_MY_CREEPS, {filter: (creep) => {return (creep.hits < creep.hitsMax );}} );
        let structuresHit = base.find(FIND_STRUCTURES, {filter: (structure) => {
            if (structure.structureType == STRUCTURE_RAMPART && !structure.pos.isEqualTo(this._baseOp.centerPos)) {
                let structures = structure.pos.lookFor(LOOK_STRUCTURES);
                _.remove(structures,{structureType:STRUCTURE_ROAD});
                if (structures.length <=1) return false;
            }
            return (structure.hits < structure.hitsMax - TOWER_POWER_REPAIR && structure.hits < MAX_HITS_REPAIR_PER_LEVEL * base.controller.level && structure.structureType!= STRUCTURE_ROAD)
        }});
        for (let tower of towers) {
            if (hostiles.length > 0) {
                let healHostiles = _.filter(hostiles,o => {return o.getActiveBodyparts(HEAL) > 0})
                let hostile = tower.pos.findClosestByRange(healHostiles);
                if (!hostile) hostile = tower.pos.findClosestByRange(hostiles);
                if (!hostile) throw Error();
                let pos = hostile.pos
                if (hostile.owner.username == c.INVADER_USERNAME || (pos.x < 49 && pos.x > 0 && pos.y <49 && pos.y > 0)) tower.attack(hostile);
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

        if (hostiles.length>0 && hostiles[0].owner.username != c.INVADER_USERNAME) {
            // activate safe mode when there are hostile without a tower.
            if (_.filter(this._baseOp.myStructures[STRUCTURE_TOWER], o => {return o.isActive()}).length == 0) {
                if (_.filter(hostiles, o => {return o.getActiveBodyparts(ATTACK) > 0|| o.getActiveBodyparts(RANGED_ATTACK) > 0})) {
                    this.baseOp.activateSafemode();
                }
            }
            for (let event of this.baseOp.events) {
                let activateSafeMode = false;
                if (event.event == EVENT_ATTACK_CONTROLLER) activateSafeMode = true;
                else if (event.event == EVENT_ATTACK) {
                    let targetId = event.data.targetId
                    if (event.data.damage > 0) {
                        let object = /**@type {RoomObject|null} */ (Game.getObjectById(/**@type {Id<RoomObject>}**/ (event.data.targetId)));
                        if (object && object instanceof OwnedStructure && object.structureType && object.my) {
                            let structureType = object.structureType;
                            switch (structureType) {
                                //case STRUCTURE_RAMPART:
                                //    break;
                                default:
                                    activateSafeMode = true;
                            }
                        } 
                        else if (object && object instanceof Creep && this._baseOp.spawns.length == 0) activateSafeMode = true;
        
                    }
                }
                else if (event.event == EVENT_OBJECT_DESTROYED && event.data.type != 'creep') activateSafeMode = true;
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

