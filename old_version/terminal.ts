"use strict";

import * as logger from 'logger';
import Base from 'base';

//const destination = 'W8N46'
//const TERMINAL_

StructureTerminal.prototype.run = function(myBases: Base[]) {
    logger.log ('structureterminal.run', 'running terminal ' + this.room.name)
    if (this.room.controller && this.room.controller.level >=8 && this.store.energy > 100000) {
        logger.log ('structureterminal.run', 'Terminal trying to send energy')
        logger.log ('structureterminal.run', myBases )
        //logger.log ('structureterminal.run', myRooms[0].terminal )
        let targetRooms = _.filter(myBases, o => {return o.room.terminal && o.room.controller && o.room.controller.level < 8 && o.room.terminal.store.energy < 250000 })
        logger.log ('structureterminal.run', targetRooms )
        if (targetRooms.length == 0) return; // geen rooms om naar te sturen
        targetRooms.sort( (a, b) => {
            let a_distance = Game.map.getRoomLinearDistance(this.room.name, a.room.name, true);
            let b_distance = Game.map.getRoomLinearDistance(this.room.name, b.room.name, true)
            if (a_distance < b_distance) return -1;
            if (a_distance > b_distance) return 1;
            return 0;
        })
        let destination = targetRooms[0].room.name;
        logger.log ('structureterminal.run', 'sending ' + 10000 + ' to ' + destination )
        let result = this.send(RESOURCE_ENERGY, 10000, destination )
        logger.log ('structureterminal.run', result)
    }
}
