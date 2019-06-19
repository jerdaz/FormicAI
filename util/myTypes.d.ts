//declare type RoomStructures = {spawns: StructureSpawn[], extensions: StructureExtension[]}
declare interface Base extends Room {controller: StructureController};

declare interface Instruction {command: number};
declare interface CreepOpInstruction extends Instruction {source: RoomObject, dest: RoomObject}


//interface CreepMemory {any}
;