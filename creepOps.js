'use strict'
function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy(creep) {
    switch (creep.memory.command) {
        case 'harvest':
            if (_.sum(creep.carry) == 0) creep.memory.state = 'harvesting';
            if (_.sum(creep.carry) == creep.carryCapacity) creep.memory.state = 'dropping';
            break;
    }
}

function command(creep) {
    switch (creep.memory.state) {
        case 'harvesting':
            let source = Game.getObjectById(creep.memory.source_id);
            creep.moveTo(source, {range:1});
            creep.harvest(source);
            break;
        case 'dropping':
            let dest = Game.getObjectById(creep.memory.dest_id);
            creep.moveTo(dest, {range:1});
            creep.transfer(dest, RESOURCE_ENERGY);
            creep.upgrade(dest);
            break;
    }
}

module.exports.main = main;
module.exports.harvest = function(creep, source, dest) {
    if (creep && source && dest) {
        creep.memory.command = 'harvest';
        creep.memory.state = 'harvesting';
        creep.memory.source_id = source.id;
        creep.memory.dest_id = dest.id;
    }
};
