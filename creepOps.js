'use strict'

//import _ from "lodash";

function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy(creep) {
    let cMem = creep.mem;
    switch (cMem.command) {
        case 'transfer':
            if (_.sum(creep.carry) == 0) cMem.state = 'retrieving';
            if (_.sum(creep.carry) == creep.carryCapacity) cMem.state = 'delivering';
            break;
    }
}

function command(creep) {
    let cMem = creep.mem;
    switch (cMem.state) {
        case 'retrieving':
            creep.moveTo(cMem.source, {range:1});
            creep.harvest(cMem.source);
            break;
        case 'delivering':
            creep.moveTo(cMem.dest, {range:1});
            creep.transfer(cMem.dest, RESOURCE_ENERGY);
            //creep.upgradeController(cMem.dest);
            creep.build(cMem.dest);
            break;
    }
}

module.exports.main = main;
module.exports.transfer = function(creep, source, dest) {
    if (creep && source && dest) {
        let cMem = creep.mem;
        cMem.command = 'transfer';
        cMem.source = source;
        cMem.dest =dest;
        if (cMem.state != 'retrieving' && cMem.state != 'delivering') cMem.state = 'retrieving';
    }
};

