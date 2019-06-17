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
        let creep = Game.getObjectById(this._creepName);
        let dest;
        if (creep.memory.dest) dest = Game.getObjectById(creep.mem.dest.id);
        if (creep.mem.command == undefined || (dest.energy == dest.energyCapacity)) {
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

'use strict'
let creepOps = require('./creepOp');

function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy(creep) {
    if (creep.mem.command == undefined || creep.mem.dest == undefined) creepOps.transfer(creep
                                    , creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                                    , creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                                    );
}

function command(creep) {
    creepOps.main(creep);
}

module.exports = main;
