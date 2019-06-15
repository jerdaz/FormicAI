'use strict'

function main() {
    let rooms = Game.rooms;

    let bases = _.filter(rooms, (o) => { return o.controller && o.controller.my});
    strategy();
    command(bases);
}

function strategy() {

}

function command(bases) {
    let baseOps = require('baseOps');
    for (let room in bases) baseOps(room);
}

module.exports = function () {main()};
