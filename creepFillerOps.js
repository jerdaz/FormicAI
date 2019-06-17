'use strict'
let CreepOp = require('./creepOp');

module.exports = class CreepFillerOp {
    /**@param {Creep} creep */
    constructor(creep) {
        this._creepName = creep.name;
        this._creepOp = new CreepOp(creep);
    }

    run() {
        this._strategy();
        this._command();
    }

    _strategy() {
        /**@type {Creep | null} */
        let creep = Game.getObjectById(this._creepName);
        if (!creep) throw Error;
        /**@type {Structure | null} */
        let dest;
        if (creep.memory.dest_id) dest = Game.getObjectById(creep.memory.dest_id);
        if (creep.memory.command == undefined || (dest.energy == dest.energyCapacity)) {
            this._creepOp.transfer(creep
                            , creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                            , creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {any}*/ o) => {
                                    return  (o.energy < o.energyCapacity)
                                            && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION)
                                    }})
                            );
        }
    }   

    _command() {
        this._creepOp.run();
    }
}
