// --- DOM Elements ---
const form = document.getElementById('workout-form');
const workoutList = document.getElementById('workout-list');
const totalWorkoutsDisplay = document.getElementById('total-workouts');
const totalCaloriesDisplay = document.getElementById('total-calories');
const errorMsg = document.getElementById('error-message');

const typeInput = document.getElementById('type');
const durationInput = document.getElementById('duration');
const caloriesInput = document.getElementById('calories');

const filterSelect = document.getElementById('filter-type');
const sortSelect = document.getElementById('sort-by');
const themeToggle = document.getElementById('theme-toggle');

const weightInput = document.getElementById('weight-input');
const heightInput = document.getElementById('height-input');
const bmiValue = document.getElementById('bmi-value');
const bmiScale = document.getElementById('bmi-scale');

const goalInput = document.getElementById('goal-input');
const progressBar = document.getElementById('progress-bar');
const goalText = document.getElementById('goal-text');

const userSelect = document.getElementById('user-profile');
const newUserInput = document.getElementById('new-user-input');
const addUserBtn = document.getElementById('add-user-btn');
const motivationalGreeting = document.getElementById('motivational-greeting');
const notificationWarning = document.getElementById('notification-warning');

// Clock Elements
const clockElement = document.getElementById('analog-clock');
const hourHand = document.getElementById('hour-hand');
const minuteHand = document.getElementById('minute-hand');
const hourTarget = document.getElementById('hour-target');
const minuteTarget = document.getElementById('minute-target');
const clockDisplay = document.getElementById('clock-display');
const ampmToggle = document.getElementById('ampm-toggle');
const setReminderBtn = document.getElementById('set-reminder-btn');

// --- Global State ---
let savedUsers = JSON.parse(localStorage.getItem('forgeFit_users')) || ['Guest'];
let currentUser = localStorage.getItem('forgeFit_lastUser') || 'Guest';

let workouts = [];
let userWeight = 70;
let userHeight = 175;
let dailyGoal = 0;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let chartInstance = null;

// Clock State
let currentHour = 12;
let currentMinute = 0;
let activeHand = null;
let isPM = new Date().getHours() >= 12; 

const metValues = { Running: 9.8, Cycling: 7.5, Weightlifting: 3.0, Yoga: 2.5, Walking: 3.8 };

// --- Initialization ---
if (isDarkMode) document.body.classList.add('dark-mode');
ampmToggle.innerText = isPM ? "PM" : "AM"; 
populateUserDropdown();
loadUserProfile(); 
updateClockUI();

// --- Event Listeners ---
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    if(workouts.length > 0) updateChart(); 
});

userSelect.addEventListener('change', () => {
    currentUser = userSelect.value;
    loadUserProfile();
});

addUserBtn.addEventListener('click', () => {
    const newName = newUserInput.value.trim();
    if (newName === "") return alert("Enter a name to create a profile!");
    
    if (!savedUsers.some(user => user.toLowerCase() === newName.toLowerCase())) {
        savedUsers.push(newName);
        localStorage.setItem('forgeFit_users', JSON.stringify(savedUsers));
        populateUserDropdown();
    }
    
    currentUser = newName;
    userSelect.value = currentUser;
    newUserInput.value = '';
    loadUserProfile();
});

durationInput.addEventListener('input', calculateWorkoutCalories);
typeInput.addEventListener('change', calculateWorkoutCalories);

weightInput.addEventListener('input', () => {
    userWeight = parseFloat(weightInput.value) || 0;
    saveData();
    calculateWorkoutCalories(); 
    calculateBMI(); 
});

heightInput.addEventListener('input', () => {
    userHeight = parseFloat(heightInput.value) || 0;
    saveData();
    calculateBMI(); 
});

goalInput.addEventListener('input', () => {
    dailyGoal = parseFloat(goalInput.value) || 0;
    saveData();
    updateProgress();
});

filterSelect.addEventListener('change', renderApp);
sortSelect.addEventListener('change', renderApp);

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const duration = parseInt(durationInput.value);
    const calories = parseInt(caloriesInput.value);

    if (duration <= 0 || isNaN(calories)) {
        errorMsg.classList.remove('hidden');
        return;
    }
    errorMsg.classList.add('hidden');

    workouts.push({ id: Date.now(), type: typeInput.value, duration, calories });
    saveData();
    renderApp();

    durationInput.value = '';
    caloriesInput.value = '';
});

// --- User Profile & Notification Check ---
function populateUserDropdown() {
    userSelect.innerHTML = '';
    savedUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.innerText = `👤 ${user}`;
        userSelect.appendChild(option);
    });
    userSelect.value = currentUser;
}

function loadUserProfile() {
    localStorage.setItem('forgeFit_lastUser', currentUser);
    motivationalGreeting.innerText = `FORGE A STRONGER VERSION OF YOURSELF, ${currentUser.toUpperCase()}.`;
    
    workouts = JSON.parse(localStorage.getItem(`workouts_${currentUser}`)) || [];
    userWeight = parseFloat(localStorage.getItem(`weight_${currentUser}`)) || 70;
    userHeight = parseFloat(localStorage.getItem(`height_${currentUser}`)) || 175;
    dailyGoal = parseFloat(localStorage.getItem(`goal_${currentUser}`)) || 0;
    
    weightInput.value = userWeight;
    heightInput.value = userHeight;
    goalInput.value = dailyGoal;
    
    renderApp();
    calculateBMI(); 
    checkNotificationPermissions();
}

function checkNotificationPermissions() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        Notification.requestPermission();
        notificationWarning.classList.add('hidden');
    } else if (Notification.permission === "denied") {
        notificationWarning.classList.remove('hidden');
    } else {
        notificationWarning.classList.add('hidden');
    }
}

// --- Analog Clock Logic ---
ampmToggle.addEventListener('click', () => {
    isPM = !isPM;
    ampmToggle.innerText = isPM ? "PM" : "AM";
});

hourTarget.addEventListener('mousedown', () => activeHand = 'hour');
minuteTarget.addEventListener('mousedown', () => activeHand = 'minute');

// Handle touch events for mobile
hourTarget.addEventListener('touchstart', (e) => { activeHand = 'hour'; e.preventDefault(); });
minuteTarget.addEventListener('touchstart', (e) => { activeHand = 'minute'; e.preventDefault(); });

document.addEventListener('mouseup', () => activeHand = null);
document.addEventListener('touchend', () => activeHand = null);

function handleClockDrag(clientX, clientY) {
    if (!activeHand) return;

    const rect = clockElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    let rad = Math.atan2(deltaY, deltaX);
    
    let deg = rad * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360; 

    if (activeHand === 'hour') {
        currentHour = Math.round(deg / 30);
        if (currentHour === 0) currentHour = 12;
    } else if (activeHand === 'minute') {
        currentMinute = Math.round(deg / 6);
        if (currentMinute === 60) currentMinute = 0;
    }
    updateClockUI();
}

clockElement.addEventListener('mousemove', (e) => handleClockDrag(e.clientX, e.clientY));
clockElement.addEventListener('touchmove', (e) => {
    if (activeHand) {
        handleClockDrag(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
    }
}, {passive: false});

function updateClockUI() {
    const hourDeg = (currentHour % 12) * 30 + (currentMinute / 2); 
    const minuteDeg = currentMinute * 6;

    hourHand.style.transform = `rotate(${hourDeg}deg)`;
    hourTarget.style.transform = `rotate(${hourDeg}deg)`;
    minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
    minuteTarget.style.transform = `rotate(${minuteDeg}deg)`;

    const formattedMin = currentMinute < 10 ? `0${currentMinute}` : currentMinute;
    clockDisplay.innerText = `${currentHour}:${formattedMin}`;
}

setReminderBtn.addEventListener('click', () => {
    if (Notification.permission !== "granted") {
        alert("Please allow notifications in your browser first!");
        checkNotificationPermissions(); 
        return;
    }

    const now = new Date();
    let targetHour = currentHour;
    if (isPM && currentHour !== 12) targetHour += 12;
    else if (!isPM && currentHour === 12) targetHour = 0; 

    let alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, currentMinute);
    if (alarmTime <= now) alarmTime.setDate(alarmTime.getDate() + 1);

    const timeUntilAlarm = alarmTime.getTime() - now.getTime();
    const displayAMPM = isPM ? "PM" : "AM";
    const formattedMin = currentMinute < 10 ? `0${currentMinute}` : currentMinute;

    alert(`Alarm set! We will notify ${currentUser} at ${currentHour}:${formattedMin} ${displayAMPM}.`);

    setTimeout(() => {
        new Notification("ForgeFit", {
            body: `TIME TO GRIND, ${currentUser.toUpperCase()}! It's ${currentHour}:${formattedMin} ${displayAMPM}. Get to work!`,
        });
    }, timeUntilAlarm);
});

// --- Helper Functions ---
function saveData() {
    localStorage.setItem(`workouts_${currentUser}`, JSON.stringify(workouts));
    localStorage.setItem(`weight_${currentUser}`, userWeight);
    localStorage.setItem(`height_${currentUser}`, userHeight);
    localStorage.setItem(`goal_${currentUser}`, dailyGoal);
}

function calculateBMI() {
    if (userWeight > 0 && userHeight > 0) {
        const heightInMeters = userHeight / 100;
        const bmi = (userWeight / (heightInMeters * heightInMeters)).toFixed(1);
        
        bmiValue.innerText = bmi;
        bmiScale.className = 'bmi-badge';

        if (bmi < 18.5) {
            bmiScale.innerText = 'UNDERWEIGHT';
            bmiScale.classList.add('bmi-underweight');
        } else if (bmi >= 18.5 && bmi <= 24.9) {
            bmiScale.innerText = 'NORMAL';
            bmiScale.classList.add('bmi-normal');
        } else if (bmi >= 25 && bmi <= 29.9) {
            bmiScale.innerText = 'OVERWEIGHT';
            bmiScale.classList.add('bmi-overweight');
        } else {
            bmiScale.innerText = 'OBESE';
            bmiScale.classList.add('bmi-obese');
        }
    } else {
        bmiValue.innerText = '--';
        bmiScale.innerText = 'ENTER METRICS';
        bmiScale.className = 'bmi-badge';
    }
}

function calculateWorkoutCalories() {
    const duration = parseFloat(durationInput.value);
    const met = metValues[typeInput.value];
    
    if (duration > 0 && userWeight > 0) {
        caloriesInput.value = Math.round(met * userWeight * (duration / 60));
    } else {
        caloriesInput.value = '';
    }
}

function renderApp() {
    workoutList.innerHTML = '';
    let filtered = workouts;
    if (filterSelect.value !== 'All') filtered = workouts.filter(w => w.type === filterSelect.value);

    const sortMethod = sortSelect.value;
    if (sortMethod === 'newest') filtered.sort((a, b) => b.id - a.id);
    else if (sortMethod === 'oldest') filtered.sort((a, b) => a.id - b.id);
    else if (sortMethod === 'highest') filtered.sort((a, b) => b.calories - a.calories);

    filtered.forEach(workout => {
        const li = document.createElement('li');
        li.classList.add('workout-item');
        li.innerHTML = `
            <div class="workout-info">
                <strong>${workout.type}</strong>
                <span>${workout.duration} MINS | ${workout.calories} KCAL</span>
            </div>
            <button class="delete-btn" onclick="deleteWorkout(${workout.id})">X</button>
        `;
        workoutList.appendChild(li);
    });

    totalWorkoutsDisplay.innerText = workouts.length;
    const totalCals = workouts.reduce((sum, w) => sum + w.calories, 0);
    totalCaloriesDisplay.innerText = `${totalCals} kcal`;

    updateProgress();
    if(workouts.length > 0) updateChart();
}

function updateProgress() {
    const totalCals = workouts.reduce((sum, w) => sum + w.calories, 0);
    
    if (dailyGoal > 0) {
        let percentage = Math.min((totalCals / dailyGoal) * 100, 100);
        progressBar.style.width = `${percentage}%`;
        
        if (percentage >= 100) {
            progressBar.style.backgroundColor = 'var(--success)';
            goalText.innerText = `${totalCals} / ${dailyGoal} KCAL - GOAL CRUSHED! 🏆`;
            goalText.style.color = 'var(--success)';
        } else {
            progressBar.style.backgroundColor = 'var(--primary-color)';
            goalText.innerText = `${totalCals} / ${dailyGoal} KCAL (${Math.round(percentage)}%)`;
            goalText.style.color = 'var(--text-muted)';
        }
    } else {
        progressBar.style.width = '0%';
        goalText.innerText = 'SET A TARGET TO SEE YOUR PROGRESS!';
        goalText.style.color = 'var(--text-muted)';
    }
}

function updateChart() {
    const ctx = document.getElementById('workoutChart').getContext('2d');
    const dataGrouped = workouts.reduce((acc, w) => {
        acc[w.type] = (acc[w.type] || 0) + w.calories;
        return acc;
    }, {});

    const textColor = isDarkMode ? '#F8FAFC' : '#18181B';
    const forgeColors = ['#FF4500', '#EA580C', '#DC2626', '#16A34A', '#2563EB']; 

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dataGrouped),
            datasets: [{
                data: Object.values(dataGrouped),
                backgroundColor: forgeColors,
                borderWidth: 2,
                borderColor: isDarkMode ? '#18181B' : '#FFFFFF'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: textColor, font: {family: 'Segoe UI', weight: 'bold'} } } }
        }
    });
}

function deleteWorkout(id) {
    workouts = workouts.filter(w => w.id !== id);
    saveData();
    renderApp();
}