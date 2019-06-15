'use strict'
function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy() {
    switch (creep.command) {
        case 'harvest':
            if (creep.state != 'harvesting' && _.sum(creep.carry) == 0) creep.state = 'harvesting';
            if (_.sum(creep.carry) == creep.carryCapacity) creep.state = 'dropping';
            break;
    }
}

function command(creep) {
    switch (creep.state) {
        case 'harvesting':
            creep.move(source, {range:1});
            creep.harvest(source);
            break;
        case 'dropping':
            creep.move(dest, {range:1});
            creep.transfer(dest, RESOURCE_ENERGY);
            break;
    }
}

module.exports = main;
exports.harvest = function(creep, source, dest) {
    creep.command = 'harvest';
    creep.source = source.id;
    creep.dest = dest.id;
}