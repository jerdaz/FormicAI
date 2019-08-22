//import {}

//declare type RoomStructures = {spawns: StructureSpawn[], extensions: StructureExtension[]}
declare interface Base extends Room {controller: StructureController};
declare var _ = import('lodash');

declare interface Instruction {command: number};
declare interface CreepOpInstruction extends Instruction {source: RoomObject, dest: RoomObject};
declare type CreepTemplate = {body: BodyPartConstant[], minLength?: number, maxLength?: number}
interface Memory {[name: string]: any}

interface CreepMemory {operationType: number, baseName: string}
;