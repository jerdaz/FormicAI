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
3. Economical: The bot's main goal is getting optimal GCL from the available time.

The behaviour is like ants: the map will automatically be filled with hives. Destroying one base will automatically trigger expansion in another shard.
Eventually the bot will kill it's own bases as well to trigger strategic evolutionary strategy.
The ants aren't aggressive, they will try to find new places to settle if pressured.

# Roadmap:
* Full link operation
* Harvesting minerals
* Trading minerals
* Track base statistics
* Destroy own bases
* Remote mining
* Roadbuilding
* Enhanced trading
* Keeper room harvesting / mining
* Defense/attack: Only if needed for continued survival or expansion

# About license:
The license is A-GPU. You may only use modified versions of (pieces of) this source code on public screeps servers if you publish the modified sources as well.
