function updatePopoutTimer() {
    chrome.storage.local.get(['currentHours', 'currentMinutes', 'currentSeconds'], (result) => {
      document.getElementById("hours").textContent = result.currentHours < 10 ? '0' + result.currentHours : result.currentHours;
      document.getElementById("minutes").textContent = result.currentMinutes < 10 ? '0' + result.currentMinutes : result.currentMinutes;
      document.getElementById("seconds").textContent = result.currentSeconds < 10 ? '0' + result.currentSeconds : result.currentSeconds;
    });
  }
  
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get('selectedTheme', (result) => {
    const theme = result.selectedTheme || 'default';
    document.body.className = ''; 
    if (theme !== 'default') {
      document.body.classList.add(theme); 
    }
  });
});

  
  setInterval(updatePopoutTimer, 1000);