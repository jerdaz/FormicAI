"use strict"
//import 'terminal';
import * as logger from 'logger';
import * as consts from 'consts';

const STAT_PERIOD = 25000 // aantal ticks tussen room statistieken.
const MIN_SPAWN_CPU_BUCKET = [7500, 5000, 2500]; // cpu bucket dat 1e, 2e en 3e spawn uitgaat

export default class Base {
    //constructor(room: Room) {super(room.name); }
    //constructor(roomName: string) {super(roomName);}
    room:Room;
    controller:StructureController;
    constructor(roomBase: Room) {
        this.room = roomBase;
        this.controller = <StructureController>roomBase.controller;
    }

    run (myBases: Base[], roomCreeps:Creep[]) {
        logger.log('base.run', 'RUNNING BASE ' + this.room.name);
        let room = this.room;
        if (Game.time % STAT_PERIOD == 0) {
            if (room.memory.energyHistory == undefined) room.memory.energyHistory = [];
            let energyHistory = room.memory.energyHistory
            energyHistory.unshift(room.memory.curEnergyStat);
            if (energyHistory.length > consts.ENERGY_HISTORY_LENGTH ) energyHistory.pop();
            room.memory.curEnergyStat = 0;
        }


        let lastErr;

        //creeps runnen. in eerste instantie vanuit het midden.
        if (roomCreeps) for (let creep of roomCreeps) {
            try {
                creep.run(); //creep.hasRun = false });
            }
            catch (err) {
                console.log ('error while running creep ' + creep);
                if (err) console.log (err.stack)
                lastErr = err;
            }
        };

        //towers runnen
        var towers = this.room.find(FIND_MY_STRUCTURES, {filter: (structure: Structure) => {return (structure.structureType == STRUCTURE_TOWER);}})
        for (let tower of towers) {
            try {
                tower.run()
            }
            catch(err){
                console.log ('Error while running tower ' + tower);
                console.log (err.stack)
                lastErr = err;
            }
        };

        // avg idle workers bijwerken en retourneren
        let mainSpawn = this.room.getSpawn();
        let runningAvgIdleWorkers
        if (mainSpawn ) runningAvgIdleWorkers =  this.room.getSpawn().calculateAvgWorkers(roomCreeps)

        //indien geen spawn, room opgeven
        if (this.controller && this.controller.my && !mainSpawn && this.room.name != Memory.colRoom){
            console.log ('WARNING: NO SPAWN IN ROOM: ' + this.room.name);
            this.controller.unclaim();
        }

        //spawns runnen
        if (this.controller && this.controller.my && Game.cpu.bucket >= MIN_SPAWN_CPU_BUCKET[2] ){
            logger.log('base.run', 'trying spawns');
            var spawns = this.room.find(FIND_MY_SPAWNS, {filter: (o:Structure) =>{return o.isActive()} });
            logger.log('base.run', spawns);
            if (spawns.length > 0) {
                let hasRun = false;
                for(let i=0; i< spawns.length && !hasRun; i++){
                    if (!spawns[i].spawning && Game.cpu.bucket >= MIN_SPAWN_CPU_BUCKET[2-i]) {
                        try {
                            logger.log('base.run', 'starting spawn ' + spawns[i].id);
                            spawns[i].run(roomCreeps, runningAvgIdleWorkers);
                            hasRun = true;
                        }
                        catch(err) {
                            console.log ('Error while running spawn ' + spawns[i] );
                            console.log (err.stack)
                            lastErr = err;
                        }

                    }
                }
            }
        }

        let links = this.room.getLinks();
        for (let link of links) {
            try {
                link.run();
            }
            catch(err) {
                console.log ('Error while running link ' + link );
                console.log (err.stack)
                lastErr = err;
            }
        }

        this.room.autoBuild();

        this.room.checkNukes();

        this.room.visualize();


        let terminal = room.find(FIND_MY_STRUCTURES, {filter: (o:Structure) => {return o.structureType == STRUCTURE_TERMINAL}})[0];
        try {
            if (terminal) terminal.run(myBases);
        }
        catch(err) {
            console.log ('Error while running terminal ' + terminal );
            console.log (err.stack)
            lastErr = err;
        }

       if (lastErr) throw lastErr;
    }
}

/*
function myBase() {};

myBase.prototype = Object.create(Room.prototype);

myBase.prototype.run = function (myRooms: Room[]) {
    let terminal = this.find(FIND_MY_STRUCTURES, {filter: (o:Structure) => {return o.structureType == STRUCTURE_TERMINAL}})[0];
    try {
        if (terminal) terminal.run(myRooms);
    }
    catch(err) {
        console.log ('Error while running terminal ' + terminal );
        console.log (err.stack)
    }
}

export {myBase};
*/
