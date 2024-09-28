let sessions = [];
let filteredSessions = [];  
let timerDisplayInterval;
let tagsArray = []; 
let currentSortColumn = ''; 
let sortDirection = 'asc'; 

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['sessions'], (result) => {
      if (result.sessions) {
        sessions = result.sessions;
        filteredSessions = sessions; 
        displaySessions(); 
      }
    });
  
    chrome.storage.local.get(['currentHours', 'currentMinutes', 'currentSeconds', 'timerRunning'], (result) => {
      if (result.timerRunning) {
        updateTimerDisplay(result.currentHours, result.currentMinutes, result.currentSeconds);
  
        if (!timerDisplayInterval) {
          timerDisplayInterval = setInterval(updateTimerDisplayFromStorage, 1000);
        }
      }
    });

        chrome.storage.sync.get('selectedTheme', (result) => {
            const theme = result.selectedTheme || 'default';
            document.body.classList.add(theme);
          });
  
    document.getElementById('session-name-header').addEventListener('click', () => sortTableBy('name', 'name-sort-icon'));
    document.getElementById('tags-header').addEventListener('click', () => sortTableBy('tags', 'tags-sort-icon'));
    document.getElementById('duration-header').addEventListener('click', () => sortTableBy('time', 'time-sort-icon'));
    document.getElementById('date-header').addEventListener('click', () => sortTableBy('startTime', 'startTime-sort-icon'));

    document.getElementById('pause').style.display = 'none';
    document.getElementById('clock-out').style.display = 'none';

        document.getElementById('theme-select').addEventListener('change', applyTheme);
  });
  
function applyTheme(event) {
    const selectedTheme = event.target.value;
    document.body.className = ''; 
    if (selectedTheme !== 'default') {
      document.body.classList.add(selectedTheme); 
    }
  
    chrome.storage.sync.set({ selectedTheme }, () => {
      console.log("Theme saved:", selectedTheme);
    });
  }

function updateTimerDisplay(hours, minutes, seconds) {
    document.getElementById("hours").textContent = hours < 10 ? '0' + hours : hours;
    document.getElementById("minutes").textContent = minutes < 10 ? '0' + minutes : minutes;
    document.getElementById("seconds").textContent = seconds < 10 ? '0' + seconds : seconds;
}
  
function updateTimerDisplayFromStorage() {
    chrome.storage.local.get(['currentHours', 'currentMinutes', 'currentSeconds'], (result) => {
        updateTimerDisplay(result.currentHours, result.currentMinutes, result.currentSeconds);
    });
}

function sortTableBy(column, iconId) {
  resetSortIcons();

  if (currentSortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortColumn = column;
    sortDirection = 'asc'; 
  }

  const sortIcon = document.getElementById(iconId);
  sortIcon.textContent = sortDirection === 'asc' ? '▲' : '▼';

  filteredSessions.sort((a, b) => {
    let aValue = a[column].toLowerCase ? a[column].toLowerCase() : a[column];
    let bValue = b[column].toLowerCase ? b[column].toLowerCase() : b[column];

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  displaySessions(); 
}

function resetSortIcons() {
  document.getElementById('name-sort-icon').textContent = '';
  document.getElementById('tags-sort-icon').textContent = '';
  document.getElementById('time-sort-icon').textContent = '';
  document.getElementById('startTime-sort-icon').textContent = '';
}

document.getElementById('search-tags').addEventListener('input', (e) => {
  const searchTerm = e.target.value.trim().toLowerCase();
  
  filteredSessions = sessions.filter(session => 
    session.tags.toLowerCase().includes(searchTerm)
  );

  displaySessions(); 
});

document.getElementById('session-tags').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const tagInput = e.target;
    const tagValue = tagInput.value.trim();

    if (tagValue && !tagsArray.includes(tagValue)) {
      tagsArray.push(tagValue); 
      displayTagBoxes(); 
      tagInput.value = ''; 
    }
  }
});

function displayTagBoxes() {
  const tagContainer = document.querySelector('.tag-container');
  tagContainer.innerHTML = ''; 

  tagsArray.forEach(tag => {
    const tagBox = document.createElement('span');
    tagBox.className = 'tag-box';
    tagBox.textContent = tag;

    tagBox.onclick = () => {
      tagsArray = tagsArray.filter(t => t !== tag); 
      displayTagBoxes(); 
    };

    tagContainer.appendChild(tagBox);
  });
}

document.getElementById("clock-in").addEventListener("click", () => {
  const sessionName = document.getElementById("session-name").value;

  if (!sessionName) {
    alert("Please enter a session name!");
    return;
  }

  const sessionId = Date.now(); 
  const sessionData = {
    id: sessionId,
    name: sessionName,
    tags: tagsArray.join(', '), 
    startTime: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    }),
    time: "00:00:00", 
    notes: "" 
  };

  sessions.push(sessionData);
  filteredSessions = sessions; 

  chrome.storage.sync.set({ sessions }, () => {
    displaySessions(); 
  });

  chrome.runtime.sendMessage({ command: "start" }, (response) => {
    if (response.status === "success") {
      console.log("Timer started");

      
      document.getElementById("pause").style.display = "inline-block";
      document.getElementById("clock-out").style.display = "inline-block";
      document.getElementById("clock-in").style.display = "none"; 
    }
  });

  if (!timerDisplayInterval) {
    timerDisplayInterval = setInterval(updateTimerDisplay, 1000);
  }

  document.getElementById("session-name").disabled = true;
  document.getElementById("session-tags").disabled = true;
});

function displaySessions() {
  const sessionsTable = document.querySelector("#sessions-log tbody");
  sessionsTable.innerHTML = ''; 

  filteredSessions.forEach((session, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${session.name}</td>
      <td>${formatTagsForTable(session.tags)}</td>
      <td>${session.time}</td>
      <td>${session.startTime}</td>
      <td contenteditable="true" class="notes-cell" data-index="${index}">${session.notes}</td> <!-- Editable Notes Column -->
      <td><button class="delete-button" data-index="${index}">Delete</button></td> <!-- Delete Button -->
    `;
    sessionsTable.appendChild(row);
  });

  const notesCells = document.querySelectorAll('.notes-cell');
  notesCells.forEach(cell => {
    cell.addEventListener('input', handleNotesEdit);
  });

  const deleteButtons = document.querySelectorAll('.delete-button');
  deleteButtons.forEach(button => {
    button.addEventListener('click', handleDeleteSession);
  });
}

function formatTagsForTable(tags) {
  const tagArray = tags.split(', ').map(tag => tag.trim());
  return tagArray.map(tag => `<span class="tag-box">${tag}</span>`).join(' ');
}

function handleDeleteSession(event) {
  const index = event.target.getAttribute('data-index'); 

  sessions.splice(index, 1);
  filteredSessions = sessions; 

  chrome.storage.sync.set({ sessions }, () => {
    displaySessions(); 
  });
}

function handleNotesEdit(event) {
  const index = event.target.getAttribute('data-index');
  sessions[index].notes = event.target.textContent; 

  chrome.storage.sync.set({ sessions }, () => {
    console.log("Notes updated for session:", sessions[index].name);
  });
}

function updateTimerDisplay() {
  chrome.storage.local.get(['currentHours', 'currentMinutes', 'currentSeconds'], (result) => {
    document.getElementById("hours").textContent = result.currentHours < 10 ? '0' + result.currentHours : result.currentHours;
    document.getElementById("minutes").textContent = result.currentMinutes < 10 ? '0' + result.currentMinutes : result.currentMinutes;
    document.getElementById("seconds").textContent = result.currentSeconds < 10 ? '0' + result.currentSeconds : result.currentSeconds;
  });
}

document.getElementById("pause").addEventListener("click", () => {
  chrome.storage.local.get(['isPaused'], (result) => {
    if (result.isPaused) {
      chrome.runtime.sendMessage({ command: "start" }, (response) => {
        document.getElementById("pause").textContent = "𓃩 Pawse";
        console.log("Timer resumed");
      });
    } else {
      chrome.runtime.sendMessage({ command: "pause" }, (response) => {
        document.getElementById("pause").textContent = "𓃦 Unpawse";
        console.log("Timer paused");
      });
    }
  });
});

document.getElementById("clock-out").addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "stop" }, (response) => {
    if (response.status === "success") {
      console.log("Timer stopped and session saved");

      clearInterval(timerDisplayInterval);
      timerDisplayInterval = null; 

      document.getElementById("hours").textContent = '00';
      document.getElementById("minutes").textContent = '00';
      document.getElementById("seconds").textContent = '00';

      chrome.storage.local.set({
        currentHours: 0,
        currentMinutes: 0,
        currentSeconds: 0,
      });

      document.getElementById("session-name").value = '';
      document.getElementById("session-tags").value = '';
      tagsArray = []; 
      displayTagBoxes(); 
      document.getElementById("session-name").disabled = false;
      document.getElementById("session-tags").disabled = false;

      document.getElementById("pause").style.display = "none";
      document.getElementById("clock-out").style.display = "none";
      document.getElementById("clock-in").style.display = "inline-block"; 
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "saveSession") {
    const lastSession = sessions[sessions.length - 1];
    lastSession.time = message.finalTime;

    chrome.storage.sync.set({ sessions }, () => {
      displaySessions();
    });
    sendResponse({ status: "sessionSaved" });
  }
});

document.getElementById("popout-icon").addEventListener("click", () => {
    chrome.windows.create({
      url: "timer.html", 
      type: "popup",
      width: 250, 
      height: 150,
      top: 50,
      left: 50,
      focused: true
    }, (newWindow) => {
      console.log("Pop-out timer window created", newWindow);
    });
  });