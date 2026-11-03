# Emberbrook: The Lost Harvest — Game Design

**Working title. Current stage: gameplay prototype. Course topic: undecided by the group.**

## What we are building

A short, single-player browser RPG about bringing a village’s stolen harvest home. Players explore connected areas, talk to villagers, prepare for battles, and defeat two guardians. The current priority is making that adventure clear, enjoyable, and reliable.

The final assignment requires one differential-calculus concept that meaningfully affects gameplay. The group has not selected it yet. The earlier Forge optimization and timing-curve proofs are paused drafts, not an approved mathematical foundation.

## Story and player goal

The Ember Dragon has taken Emberbrook’s harvest, leaving the village unprepared for winter. Elder Thales asks the hero to recover it. Smith Vulcan helps with healing and supplies. A Stone Golem guards the mountain route; defeating it opens the way to Ember Summit.

The goal is to defeat the dragon and bring the harvest home. The victory screen celebrates the village’s recovery rather than grading the player’s mathematical build.

## Design priorities

1. **Readable exploration.** Smooth movement, a following camera, clear doorways and a useful interaction prompt.
2. **A believable village.** NPCs live in furnished houses and explain where to go and how to prepare.
3. **Understandable battles.** Attack, Item and Run have clear outcomes. Health, damage and status effects are easy to read.
4. **A manageable adventure.** A small cast, six existing areas, two bosses and a complete ending.
5. **A replaceable rules layer.** Temporary combat values keep playtesting possible while the group decides the course topic.

## World and roles

| Area | Purpose |
| --- | --- |
| Emberbrook Village | Safe starting area and home |
| Elder’s House | Quest introduction and progress guidance |
| Vulcan’s Forge | Free healing, potion shop and village credit |
| Whispering Forest | Training encounters and paths to both bosses |
| Stonebound Cavern | First boss encounter |
| Ember Summit | Final boss and story resolution |

Story roles are the hero, Elder, smith, slimes, goblins, Golem and dragon. These are character roles, not a required number of group members. Display names can be customized.

## Player loop

Explore → talk and prepare → enter a dangerous region → choose a battle action → review the result → return to town or continue.

The existing progression is a playtest starting point: reach Level 3 for the Golem, defeat it, then reach Level 5 for the dragon. These thresholds and enemy numbers can change after playtesting.

## Controls

- Hold WASD / arrows or drag the joystick to move continuously.
- Use E / Space, Action, or the nearby prompt to interact.
- Walk through marked doorways to enter houses and travel between regions.
- Open How to play for controls, preparation, routes and battle advice.

## Battles

**Attack:** start a charge and release near the center. Timing is a temporary action-game mechanic, not a selected course concept.

**Item:** open the inventory and use a healing potion. It restores up to 40 HP and consumes a turn.

**Run:** a 75% escape chance against regular enemies. Failure gives the enemy a turn. Guardians block escape.

Slimes slow the charge, goblins poison, the Golem damages armor, and the dragon causes burn. The dragon becomes stronger at half health. Animations and damage numbers communicate attacks and hits.

After a battle, the report shows the outcome, rewards and optional Battle details: attacks, critical hits and damage. Formula explanations are paused.

## Winning, losing and saving

Winning means defeating the dragon and returning the harvest. Losing returns the hero to the village with full health and half their gold. Levels and quest progress remain.

Existing saves retain progression, inventory, gold, debt and cast names. Legacy build allocations remain stored for compatibility but have no effect on active combat. The current version saves the region and continuous position.

## Next design work

These are priorities for the next design pass, not new features already implemented:

- Playtest the first few minutes: is the Elder’s house easy to find, and is the next destination clear?
- Check movement, doors and battles on an actual phone and desktop browser.
- Tune encounter length, healing, travel distances and the amount of repeated training.
- Improve visual consistency, scene composition and animation feedback where playtests reveal confusion.
- Add story detail only where it helps the existing adventure.

Extra classes, more regions, equipment systems and additional bosses remain optional. Keep the scope small enough for the group to finish and explain.

## Group decision before course integration

Bring the actual lesson/topic list to the discussion. Choose one concept the group understands, agree how it changes a player decision or outcome, and work through one numerical example together. Then replace the relevant prototype rule and verify it in the game.

The game title does not need to name the concept. The final explanation must match what the submitted game actually calculates. Current temporary rules and the paused drafts do not establish that the assignment’s mathematical requirement is complete.

## Validation

The automated checks cover exploration, reachable exits/NPCs, saves, combat turns, boss progression, guides and reports. They also verify that active combat does not call the paused calculus functions. Offline map/battle images have been inspected; browser layout and device testing remain outstanding.
