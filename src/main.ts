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

  const submitter = (e as SubmitEvent).submitter as HTMLButtonElement;
  const buttonValue = submitter.value;

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
  sessionStorage.setItem('mode', buttonValue);

  location.href = '/game.html';
});
