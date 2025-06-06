# FormicAI
FormicAI is a bot for the screeps game.

# Introduction
This bot is fully autonomous. No user interaction is required, other than placing the first spawn.

# Features
* Automatic base building
* Automatic mining/harvesting
* Link operation
* Basic tower defense against invaders
* Automatic expansion to other rooms
* Automatic expansion to other shards
* Low on CPU: ~1 cpu per room. Ideal for shard3 / free accounts.

# Overview
This is my second fully automated bot. The previous one was very efficient but grew too complex. I'm spending much more time keeping things clean/organized. It has been rewritten from scratch to reduce complexity and make ik scaleable. Currently it is still
in early development. I'm going slow. Every month will get 1 or 2 features improving economic efficiency (GCL gained) and the rest of the 
time is spent improving the code quality.

# Principles
1. Survival: The bot should be able to recover from (near) extinction automatically. No respawns should be necessary.
2. Quality/scalability: The bot should be easy to scale and expand with new features
3. Economical: The bot's main goal is leveling GCL as much as possible.

The behaviour is like ants: the map will automatically be filled with hives. Destroying one base will automatically trigger expansion in another shard.
Eventually the bot will kill it's own bases as well to trigger strategic evolutionary strategy.
The ants aren't aggressive, they will try to find new places to settle if pressured.

# Operations
The bot is build around 'operations'. An operation is responsible for performing a certain business task. Like running a base, harvesting a source or spawning new creeps. Every operation can have child operations. This means there are no roles, and there is no OS. Just operations who need to run a task. If CPU is low, only important operations get CPU resources. Future limited resources will be divided between operations and eventually every operation will be able to determine a local value for any resource (CPU, Energy, minerals etc.)

This bot does not use Memory. Everything is stored in the class instances. In case of a global reset, state will be reconstructed from the current world state.

Every operations has primary functions:
* InitTick -> Initialize the tick to update all cached game objects in the class structures.
* Command -> Perform any operational tasks (executes every tick)
* Tactics -> Perform any tactical tasks (executes every 10 ticks)
* Strategic -> Perform any strategical tasks (execute every 100 ticks)
* Support -> Perform any support/cleanup tasks (execute every 1000 ticks)

Offset is randomized to prevent all strategic tasks to fire in the same tick.

# Creep Operation
Every operation on a shard can have one or multiple creep operations assigned to them. The behaviour of the creeps is run from the operations. They assign high level commands to creeps, like harvest source X, or fill extension Y. Creeps themselves have higher level commands. Currently these commands are supported:
* transfer: Transfer energy between 2 room objects.
* harvest: Harvest a source an drop energy in nearby roomobjects with storage.
* fill: Fill/build/repair/upgrade a roomobject or building site with energy, gather from nearby sources or harvest from sources.
* move: move to a place
* claim: Claim a controller

The commands are smarter then standard creep commands. For example, giving a fill command on a controller starts upgrading it. A broken structure will be repaired, an empty structure will be filled etc.

# Roadmap:
* Full link operation
* Harvesting minerals
* Trading minerals
* Track base statistics
* Destroy own bases
* Remote mining
* Roadbuilding
* Internal economy.
* Keeper room harvesting / mining
* Defense/attack: Only if needed for continued survival or expansion

# About license:
The license is A-GPU. You may only use modified versions of (pieces of) this source code on public screeps servers if you publish the source code of the modified version with this license.

## Installation

1. Install [Node.js](https://nodejs.org/) and run `npm install` to install the dependencies.
2. Create a `.screeps.json` file in the project root. This file contains the credentials for your Screeps account and is used by the `grunt-screeps` task. The structure looks like:

```json
{
  "email": "you@example.com",
  "password": "secret",
  "branch": "default",
  "ptr": false
}
```

## Usage

To upload the bot to a Screeps server run:

```bash
grunt --server=screeps
```

The `publish.cmd` script contains convenience commands for the different servers that the author uses. You can also run `npm test` but at the moment there are no automated tests and the command will simply exit with an error.

## Project Structure

The code is organised around **operations**. Each operation handles a specific aspect of the game and operations can have child operations. Important classes are:

- `MainOp` &ndash; root of the hierarchy. It creates a `ShardOp` for the current shard.
- `ShardOp` &ndash; manages all bases on a shard and handles CPU allocation.
- `BaseOp` &ndash; controls a single base. It spawns creeps and contains sub operations such as `FillingOp`, `UpgradingOp` and `SpawningOp`.
- `RoomOp` &ndash; handles tasks inside a room (building, harvesting, road maintenance &nbsp;...).
- `CreepOp` &ndash; wrapper around a single creep implementing high level commands.

For a complete overview of all classes and their role see [docs/DESIGN.md](docs/DESIGN.md).
The design document includes a short description for every operation class.
