'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + ``).slice(-10);    // LAST 10 NUMBERS OF THE WHOLE DATE
  clicks = 0;
  constructor(coords, distance, duration) {
    // this.date = ...;
    // this.id = ...;
    this.coords = coords;     // [latitude, longitude]
    this.distance = distance; // in km
    this.duration = duration; // in mins

  }

  _setDecription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
};

class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDecription();

  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
};

class Cycling extends Workout {
  type = `cycling`;
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDecription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
};

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

///////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 16;
  constructor() { // IMPORTANT WE CAN CALL FUNCTIONS THAT WE WANT TO EXECUTE IMMEDIATLY AS THE PAGE LOADS
    // GET USERS POSITION
    this._getPosition();

    // GET DATA FROM LOCAL STORAGE
    this._getLocalStorage();

    // ATTACH EVENT HANDLERS
    form.addEventListener(`submit`, this._newWorkout.bind(this));

    inputType.addEventListener(`change`, this._toggleElevationField);

    containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert(`Could not get your position`);
      });
    };

  }
  _loadMap(position) {
    const { latitude } = position.coords;   // const latitude == postition.coords.latitude
    const { longitude } = position.coords;  // const longitude == postition.coords.longitude
    console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // HANDLING CLICKS ON MAP
    this.#map.on(`click`, this._showForm.bind(this));

    // RENDER THE MARKERS AFTER LOADING THE DATA FROM LOCAL

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove(`hidden`);
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ``;

    form.style.display = `none`;
    form.classList.add(`hidden`);
    setTimeout(function () {
      form.style.display = `grid`;
    }, 1000)
  }

  _toggleElevationField() {
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    // GET DATA FROM FORM
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // IF ACTIVITY = RUNNING, CREATE RUNNING OBJECT
    if (type === `running`) {
      const cadence = +inputCadence.value;
      // CHECK IF DATA IS VALID
      if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert(`Inputs have to be positive numbers!`);

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // IF ACTIVITY = CYCLING, CREATE CYCLING OBJECT
    if (type === `cycling`) {
      const elevation = +inputElevation.value;
      // CHECK IF DATA IS VALID
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert(`Inputs have to be positive numbers!`);

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // ADD NEW WORKOUT OBJECT TO ARRAY
    this.#workouts.push(workout);
    // console.log(workout);

    // RENDER WORKOUT ON MAP AS MARKER
    this._renderWorkoutMarker(workout);

    // RENDER WORKOUT ON LIST
    this._renderWorkout(workout);
    // DISPLAY MARKER    

    // HIDE FROM + CLEAR INPUT FIELDS
    this._hideForm();

    // SET LOCAL STORAGE TO ALL WORKOUTS
    this._setLocalStorage();
  }

  // ADDING MARKERS
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
      maxWidth: 250,
      maxHeight: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`
    })).setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`).openPopup();
  }
  // ADDING THE WORKOUT ELEMENTS TO THE HTML
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === `running`) {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === `cycling`) {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML(`afterend`, html);      //afterend AND beforeend parameters add elements as sibling elements
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(`.workout`);
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);  // IMPORTANT GREAT USECASE OF DATASET PROPERTY
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      }
    });
    // USING THE PUBLIC INTERFACE
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem(`workouts`, JSON.stringify(this.#workouts)); // CONVERTS BACK FROM OBJECTS TO STRINGS  (REMEMBER THAT ARRAYS ARE ALSO CONSIDERED OBJECTS)
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));  // CONVERTS BACK FROM STRINGS TO OBJECTS 
    // IMPORTANT OBJECTS RETRIEVED FROM LOCAL STORAGE NO LONGER HAVE THE OBJECT PROPERTIES OR METHODS, THEY ARE STORED AS REGULAR OBJECTS, SO WE NO LONGER HAVE WORKOUT OBJECTS BUT SIMPLE OBJECTS
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem(`workouts`);
    location.reload();
  }
};

const app = new App();
