'use strict'
function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy(creep) {
    switch (creep.command) {
        case 'harvest':
            if (_.sum(creep.carry) == 0) creep.state = 'harvesting';
            if (_.sum(creep.carry) == creep.carryCapacity) creep.state = 'dropping';
            break;
    }
}

function command(creep) {
    switch (creep.state) {
        case 'harvesting':
            let source = Game.getObjectById(creep.memory.source.id);
            creep.moveTo(source, {range:1});
            creep.harvest(source);
            break;
        case 'dropping':
            let dest = Game.getObjectById(creep.memory.dest.id);
            creep.moveTo(dest, {range:1});
            creep.transfer(dest, RESOURCE_ENERGY);
            break;
    }
}

module.exports.main = main;
module.exports.harvest = function(creep, source, dest) {
    creep.memory.command = 'harvest';
    creep.memory.state = 'harvesting';
    creep.memory.source_id = source.id;
    creep.memory.dest_id = dest.id;
};
