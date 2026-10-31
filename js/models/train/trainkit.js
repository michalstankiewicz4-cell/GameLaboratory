// TrainKit — wejście: tabor (lokomotywa, wagony), z aTrain. Dla laboratoriów
// pisanych jako klasyczne skrypty jest też window.TrainKit.
//
//   data.js        wymiary, profil koła, zderzaki, sprzęgi (wspólne z fizyką)
//   materials.js   materiały taboru i toru
//   texkit.js      tekstury proceduralne (TexKit)
//   parts/         zestaw kołowy, zawieszenie, zderzaki, sprzęgi
//   bodies/        nadwozia: lokomotywa, wagon drewniany, wagon stalowy
//   vehicle.js     pojazd złożony z części
//   train.js       skład pojazdów
import * as data from "./data.js";
import { BODIES, buildVehicle } from "./vehicle.js";
import { DEFAULT_TRAIN, buildTrain } from "./train.js";
import { setSpring } from "./parts/suspension.js";
import { setBuffer } from "./parts/buffers.js";
import { setKnuckle } from "./parts/couplers.js";

export { data, BODIES, buildVehicle, DEFAULT_TRAIN, buildTrain, setSpring, setBuffer, setKnuckle };
window.TrainKit = { data, BODIES, buildVehicle, DEFAULT_TRAIN, buildTrain, setSpring, setBuffer, setKnuckle };
