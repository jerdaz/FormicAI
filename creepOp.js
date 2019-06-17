'use strict'

module.exports = class CreepFillerOp {
    /**@param {Creep} creep */
    constructor(creep) {
        this._creepName = creep.name;
    }

    run() {
        let creep = Game.creeps[this._creepName];
        this._strategy(creep);
        this._command(creep);
    }

    /**@param {Creep} creep */
    /**@param {Source} source */
    /**@param {Structure} dest */
    transfer (creep, source, dest) {
        if (!creep || !source || !dest) throw Error;
        let cMem = creep.memory;
        cMem.command = 'transfer';
        cMem.source = source;
        cMem.dest =dest;
        if (cMem.state != 'retrieving' && cMem.state != 'delivering') cMem.state = 'retrieving';
    };
    
     /**@param {Creep} creep */
     _strategy(creep) {
        let cMem = creep.memory;
        switch (cMem.command) {
            case 'transfer':
                if (creep.carry.energy == 0) cMem.state = 'retrieving';
                if (creep.carry.energy == creep.carryCapacity) cMem.state = 'delivering';
                break;
        }
    }   

    /**@param {Creep} creep */
    _command(creep) {
        let cMem = creep.memory;
        switch (cMem.state) {
            case 'retrieving':
                creep.moveTo(cMem.source, {range:1});
                creep.harvest(cMem.source);
                break;
            case 'delivering':
                creep.moveTo(cMem.dest, {range:1});
                creep.transfer(cMem.dest, RESOURCE_ENERGY);
                creep.build(cMem.dest);
                break;
        }    
    }
}


