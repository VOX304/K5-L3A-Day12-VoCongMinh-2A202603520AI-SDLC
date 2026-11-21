import { writeFileSync } from 'node:fs';
import { gameContract } from '../src/sim/tuning.js';

writeFileSync('game.contract.json', `${JSON.stringify(gameContract(), null, 2)}\n`);
