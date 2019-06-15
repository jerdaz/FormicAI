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
            creep.move(creep.source, {range:1});
            creep.harvest(creep.source);
            break;
        case 'dropping':
            creep.move(creep.dest, {range:1});
            creep.transfer(creep.dest, RESOURCE_ENERGY);
            break;
    }
}

module.exports.main = main;
module.exports.harvest = function(creep, source, dest) {
    creep.command = 'harvest';
    creep.state = 'harvesting';
    creep.source = source;
    creep.dest = dest;
};
