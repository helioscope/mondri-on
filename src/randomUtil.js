import _ from 'lodash';
// import Alea from 'alea';

let rand = Math.random;//new Alea();

export function setRandomFunction(newRandomFunction) {
  rand = newRandomFunction;
}

export function getNewRandomSeed() {
  return randomRangeInt(0, 99999999); // not exactly hardcore, but probably fine for our purposes
}

export function setRandomSeed(seed) {
  console.warn('setRandomSeed not supported');
  // rand = new Alea(seed);
}

export function exportRandomState() {
  console.warn('exportRandomState not supported');
  // return rand.exportState();
}

export function importRandomState(state) {
  console.warn('importRandomState not supported');
  // rand = Alea.importState(state);
}

export function getRandomValue(scale = 1) {
  return rand() * scale;
}

export function randomOdds(chance) {
  // assumes chance is between 0 and 1, so 0.5 is 50% odds
  return rand() < chance;
}

export function randomPickOne(optionsArr) {
  return optionsArr[randomRangeInt(0, optionsArr.length - 1)];
}
export function randomPickMultiple(optionsArr, numPicks) {
  const lastIndex = optionsArr.length - 1;
  let picks = [];

  for (let i = 0; i < numPicks; i++) {
    picks.push(optionsArr[randomRangeInt(0, lastIndex)]);
  }
  
  return picks;
}
export function randomPull(optionsArr, numPicks, mutate=false) {
  if (numPicks > optionsArr.length) {
    console.warn("WARNING: can't pull more than are in the list")
    numPicks = optionsArr.length;
  }
  
  if (mutate == false) {
    optionsArr = optionsArr.slice();
  }

  let lastIndex = optionsArr.length - 1;
  let picks = [];

  for (let i = 0; i < numPicks; i++) {
    let randomIndex = randomRangeInt(0, lastIndex);
    picks.push(optionsArr[randomIndex]);
    optionsArr.splice(randomIndex, 1);
    lastIndex--;
  }
  
  return picks;
}

export function randomRange(min, max) {
  const range = max - min;
  return (rand() * range) + min;
}
export function randomRangeFromArray(arr) {
  return randomRange(arr[0],arr[1]);
}

export function randomRangeInt(min, max) {
  const range = max - min + 1; // add 1 to be inclusive of the max value
  return Math.floor((rand() * range) + min);
}
export function randomRangeIntFromArray(arr) {
  return randomRangeInt(arr[0],arr[1]);
}

export function remapValue(value, inMin, inMax, outMin, outMax) {
  // remap value from its initial range ("in" min and max) to a new range ("out" min & max)
  const inRange = inMax - inMin;
  const outRange = outMax - outMin
  return outRange * ((value - inMin) / inRange) + outMin;
}
export function remapValueFromArrays(value, inArr, outArr) {
  return remapValue(value, inArr[0], inArr[1], outArr[0], outArr[1]);
}

export function shuffleArray(arr,times=1) {
  let length = arr.length;
  let lastIndex = length - 1;
  let index = -1;
  while (++index < length) {
      let rand = randomRange(index, lastIndex);
      let value = arr[rand];
      arr[rand] = arr[index];
      arr[index] = value;
  }
  return arr;
}

export class WeightedOddsPicker {
  // choice format: {value: 'anything', weight: NUMBER}
  constructor(choicesArray) {
    this.totalWeight = 0;
    this.choices = [];

    _.each(choicesArray, this.addChoice.bind(this));
  }

  addChoice(choice) {
    let storedChoice = Object.assign({}, choice);
    
    this.totalWeight += choice.weight;
    storedChoice.upperLimit = this.totalWeight;
    this.choices.push(storedChoice);
  }

  pickOne() {
    let odds = rand() * this.totalWeight;
    let choices = this.choices;
    let imax = choices.length;
    for (let i = 0; i < imax; i++) {
      let choice = choices[i];
      if (odds < choice.upperLimit) {
        return choice.value;
      }
    }
    console.warn("weighted picker odds overran choices? this shouldn't happen! egad!", odds, this.totalWeight);
    return choices[choices.length - 1].value;
  }
}

