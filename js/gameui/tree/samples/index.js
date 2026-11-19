// Przykładowe drzewka (format 'gamelab-tree'): nazwa → definicja. Czytają je laboratorium drzewek i okno drzewka w UI gry
// (blok { type: 'tree', tree: 'nazwa' }, gdy nie ma zapisanego zasobu o tej nazwie).
import HIVE_HUNGER from './hive-hunger.js';
import { SPACE_SWARM, SPACE_CODE } from './space.js';

export const TREE_SAMPLES = { 'Hive Hunger': HIVE_HUNGER, 'Space — swarm': SPACE_SWARM, 'Space — programming': SPACE_CODE };
