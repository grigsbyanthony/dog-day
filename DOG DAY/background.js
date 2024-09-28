let timerInterval;
let startTime = 0;
let pausedTime = 0;
let isPaused = false;
let timerRunning = false;

function startTimer() {
    chrome.storage.local.get(['pausedTime', 'startTime'], (result) => { 
      if (result.pausedTime) {
        startTime = new Date().getTime() - result.pausedTime; // Resume from paused time
      } else if (!result.startTime || result.startTime === 0) {
        startTime = new Date().getTime(); // Start new session
      } else {
        startTime = result.startTime; // Continue running timer
      }
  
      isPaused = false;
      timerRunning = true;
  
      chrome.storage.local.set({ startTime, isPaused, timerRunning });
  
      timerInterval = setInterval(() => {
        updateTimer();
      }, 1000);
    });
  }

function formatTime(hours, minutes, seconds) {
  const formattedHours = hours < 10 ? '0' + hours : hours;
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
  const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

function updateTimer() {
  chrome.storage.local.get(['startTime', 'isPaused'], (result) => {
    if (!result.isPaused) {
      const currentTime = new Date().getTime();
      const elapsedTime = currentTime - result.startTime;

      const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
      const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

      chrome.storage.local.set({
        currentHours: hours,
        currentMinutes: minutes,
        currentSeconds: seconds
      });
    }
  });
}

function pauseTimer() {
  clearInterval(timerInterval);
  chrome.storage.local.get(['startTime'], (result) => {
    pausedTime = new Date().getTime() - result.startTime;
    isPaused = true;
    chrome.storage.local.set({ pausedTime, isPaused });
  });
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  isPaused = false;

  chrome.storage.local.get(['currentHours', 'currentMinutes', 'currentSeconds'], (result) => {
    const finalTime = formatTime(result.currentHours, result.currentMinutes, result.currentSeconds);

    chrome.runtime.sendMessage({ command: "saveSession", finalTime: finalTime }, (response) => {
      console.log("Session saved:", finalTime);
    });

    chrome.storage.local.set({
      startTime: 0,
      pausedTime: 0,
      isPaused: false,
      timerRunning: false,
      currentHours: 0,
      currentMinutes: 0,
      currentSeconds: 0
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "start") {
    startTimer();
  } else if (message.command === "pause") {
    pauseTimer();
  } else if (message.command === "stop") {
    stopTimer();
  }
  sendResponse({ status: "success" });
});