"use strict";


//Feeder is een plek naast een source waar een worker energie kan zuigen.
function Feeder(myPos,mySource) {
    this.pos = myPos;
    this.room = Game.rooms[myPos.roomName];
    this.xOffset = - mySource.pos.x + myPos.x;
    this.yOffset = - mySource.pos.y + myPos.y;
    this.valid = Game.map.getTerrainAt(myPos) != "wall";
    this.source = mySource;
}
Feeder.prototype = Object.create(RoomObject.prototype);
Feeder.prototype.constuctor = Feeder;
Feeder.prototype.queue = [];
Feeder.prototype.addQueue = function(myCreep) {
    this.queue.push(myCreep);
    myCreep.feeder = this;
    myCreep.memory.inQueue = true;
}
Feeder.prototype.clearQueue = function() {
    this.queue = [];
}
Feeder.prototype.getQeueuRoomPosition = function(myCreep) {
    var queueNr = -1;
    for(var i=0; i < this.queue.length; i++) if (this.queue[i].id == myCreep.id) queueNr = i;
    if (queueNr>=0) return new RoomPosition(this.pos.x + this.xOffset*queueNr, this.pos.y + this.yOffset*queueNr, this.pos.roomName);
}
Feeder.prototype.run = function() {
//    console.log ('RUNNING Feeder queue length '+ this.queue.length);
    for(var i=0; i < this.queue.length; i++) {
        var creep = this.queue[i];
//        console.log('running feeder at ' + this.pos + ' for creep ' + creep + 'waiting at spot ' + i )
        creep.idle=false;
        if (i==0 && creep.carryCapacity == creep.carry.energy) {
            delete creep.feeder; // creep krijg controle weer terug.
            delete creep.memory.inQueue;
        }
        else if (i==0 && (this.pos.lookFor(LOOK_CREEPS).length == 0 || this.pos.isEqualTo(creep.pos))) {
//            console.log('creep aan de beurt en op locatie');
            creep.moveTo(this.pos);
            creep.harvest(this.source);
//            delete this.queue[i]; // wordt aan het eind goedgezet
//        } else if (i==0) {
//            console.log('creep harversting');
//            console.log (creep.harvest(this.source));
//            if (creep.harvest(this.source) == ERR_NOT_IN_RANGE) creep.moveTo(this.pos,{visualizePathStyle: {stroke: '#ffff00'}});
        } else {
            var queuePosition = this.getQeueuRoomPosition(creep);
//            console.log ('creep moving the queue position ' +queuePosition);
            if (i >= 1) creep.idle = true;
            creep.moveTo(queuePosition,{visualizePathStyle: {stroke: '#ffff00'}});
        }  
    }
    
    //indien eerste creep verwijderd is, de array goedzetten
    if (this.queue[0] === null) queue.shift();
}


Source.prototype.getFeeders = function() {
    // alle vrije plekken zoeken rondom source
    var result = [];
    for (var x=-1;x<=1;x++) {
        for (var y=-1;y<=1;y++) {
            var feeder = new Feeder(new RoomPosition(this.pos.x+x,this.pos.y+y,this.pos.roomName),this);
            if (feeder.valid) result.push(feeder);
        }
    }
    return result;
}

module.exports = {
    run: function (source) {
        // alle vrije plekken zoeken rondom source
        for (x=-1;x<=1;x++)
            for (y=-1;y<=1;y++) {
                if (source.room.map.getTerrain(source.pos.x+x, source.pos.y+y) != "wall" ) {
                    // kijken of hij vrij is
                }
            }
        return;
    }
    
};