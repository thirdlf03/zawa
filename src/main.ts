import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';

document.getElementById('add-ball')?.addEventListener('click', function() {
  const ballForm = document.getElementById('ball-form');
  if (ballForm) {
    const newBallInput = document.createElement('div');
    newBallInput.className = 'ball-input';
    newBallInput.innerHTML = `
      <input class="ball-name" placeholder="Enter ball name..." />
      <input class="ball-priority" type="number" placeholder="Priority (default 1)" value="1" />
    `;
    ballForm.insertBefore(newBallInput, this);
  }
});

interface BallData {
  name: string;
  priority: number;
}

const ballDataArray: BallData[] = [];

document.getElementById('ball-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const ballInputs = document.querySelectorAll('.ball-input');
  ballDataArray.length = 0;

  ballInputs.forEach(inputDiv => {
    let name = (inputDiv.querySelector('.ball-name') as HTMLInputElement).value;
    if (name == null){
      name = ''
    }
    const priority = parseInt((inputDiv.querySelector('.ball-priority') as HTMLInputElement).value, 10);
    ballDataArray.push({ name, priority });
  });

  sessionStorage.setItem('balls', JSON.stringify(ballDataArray));

  location.href = '/game.html';
});
