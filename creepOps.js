'use strict'
let mem = [];

function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy(creep) {
    let cMem = mem[creep.name];
    switch (cMem.command) {
        case 'harvest':
            if (_.sum(creep.carry) == 0) cMem.state = 'harvesting';
            if (_.sum(creep.carry) == creep.carryCapacity) cMem.state = 'dropping';
            break;
    }
}

function command(creep) {
    let cMem = mem[creep.name];
    switch (cMem.state) {
        case 'harvesting':
            creep.moveTo(cMem.source, {range:1});
            creep.harvest(cMem.source);
            break;
        case 'dropping':
            creep.moveTo(cMem.dest, {range:1});
            creep.transfer(cMem.dest, RESOURCE_ENERGY);
            creep.upgradeController(cMem.dest);
            creep.build(cMem.dest);
            break;
    }
}

module.exports.main = main;
module.exports.harvest = function(creep, source, dest) {
    if (creep && source && dest) {
        cMem = mem[creep.name];
        cMem.command = 'harvest';
        cMem.source = source;
        cMem.dest =dest;
        if (cMem.state != 'harvesting' && cMem.state != 'dropping') cMem.state = 'harvesting';
    }
};
//module.exports.setDest = function(creep, dest) {mem[creep.name].dest=dest;}
//module.exports.setSource = function (creep, source) {mem[creep.name].source=source}

module.exports.getDest = function(creep) {return mem[creep.name].dest;}
module.exports.getCommand = function(creep) {return mem[creep.name].command;}
