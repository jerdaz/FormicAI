
declare type Debug = import ('./debug');
declare type Operation = import('./operation')
declare type ChildOp = import('./childOp')
declare type ShardOp = import('./shardOp')
declare type ShardChildOp = import('./shardChildOp');
declare type MapOp = import('./mapOp');
declare type CreepOp = import('.creepOp');
declare type BaseOp = import('./baseOp');
declare type BaseChildOp = import('./baseChildOp');
declare type SpawningOp = import('./spawningOp');
declare type FillingOp = import('./fillingOp');
declare type UpgradingOp = import('./upgradingOp');
declare type BuildingOp = import('./buildingOp');
declare type TowerOp = import('./TowerOp');
declare type ColonizingOp = import('./colonizingOp');

declare interface Base extends Room {controller: StructureController};
declare var _ = import('lodash');

declare interface Instruction {command: number};
declare interface CreepOpInstruction extends Instruction {source: RoomObject, dest: RoomObject};
declare type CreepTemplate = {body: BodyPartConstant[], minLength?: number, maxLength?: number}
interface Memory {[name: string]: any}

interface CreepMemory {operationType: number, baseName: string}
;