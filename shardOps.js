'use strict'

function main() {
    var rooms = Game.rooms;

    var bases = _.filter(rooms, (o) => { return o.controller && o.controller.my});
    strategy();
    command(bases);

    function getBases(rooms){
        var bases = []
        for(var room in rooms) {
            if (room.controller && room.controller.my) bases.concat(room);
        }
    }
}

function strategy() {

}

function command(bases) {
    var baseOps = require('baseOps');
    for (var room in bases) baseOps(room);
}

module.exports = function () {main()};
