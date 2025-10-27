// =================================================================
// PART 1: IMPORTS, CONFIG, AND NON-DOM VARIABLES/FUNCTIONS
// This code runs first and does not touch the HTML document.
// =================================================================

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, getDoc, writeBatch, query, where, getDocs, limit, updateDoc, orderBy, startAfter } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Enable more detailed error logging in development
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.debug('Debug mode enabled');
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
        return false;
    };
}

// --- State Variables ---
let db, auth;
let allCourses = [], allMeets = [], allRaces = [], allAthletes = [], allSchools = [];
let itemToDelete = null;
let detectedRacesCache = [];
let currentAthleteViewSource = { view: 'athletes', context: null };
let currentSchoolForRoster = null;
let currentMeetCache = {};
let currentEventName = '', currentEventDate = '';
let athleteChart = null;
let raceResultsCache = [];
let currentAthleteIdForPrediction = null;
let athleteResultsCache = [];
let athleteResultsSort = { column: 'raceDate', direction: 'desc' };
let resultsSort = { column: 'place', direction: 'asc' };
let resultsCurrentPage = 1;
const RESULTS_PER_PAGE = 100;
let seasonRankingsCache = [];
let teamRankingsCache = [];

// --- Pagination Variables ---
let lastVisibleMeet = null;
const MEETS_PER_PAGE = 25;
let lastVisibleAthlete = null;
const ITEMS_PER_PAGE = 50;

// --- Firebase Config & Constants ---
const firebaseConfig = { apiKey: "AIzaSyCbzV-L_jXbP30PcQMDJhSs8Zfa2v_Icg4",  authDomain: "stryde-xc.firebaseapp.com",  projectId: "stryde-xc", storageBucket: "stryde-xc.appspot.com", messagingSenderId: "69433034382", appId: "1:69433034382:web:120b886b7bde7509caabdf",    measurementId: "G-9SCFV46E81"};
const appId = 'stryde-xc-live';
const MEETS_COLLECTION = `artifacts/${appId}/public/data/meets`;
const RACES_COLLECTION = `artifacts/${appId}/public/data/races`;
const RESULTS_COLLECTION = `artifacts/${appId}/public/data/results`;
const COURSES_COLLECTION = `artifacts/${appId}/public/data/courses`;
const ATHLETES_COLLECTION = `artifacts/${appId}/public/data/athletes`;

// --- Helper Functions that DO NOT use the DOM ---
const formatDate = (dateString) => {if (!dateString) return 'N/A';const date = new Date(dateString); return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });};
const formatShortDate = (dateString) => {   if (!dateString) return 'N/A';    const date = new Date(dateString);  const month = date.getUTCMonth() + 1;  const day = date.getUTCDate();    const year = date.getUTCFullYear().toString().slice(-2);    return `${month}/${day}/${year}`;};
const formatSecondsToTime = (totalSeconds) => {    if (totalSeconds === Infinity || isNaN(totalSeconds) || totalSeconds === null) return 'N/A';    const minutes = Math.floor(totalSeconds / 60);    const seconds = (totalSeconds % 60).toFixed(2);    return `${minutes}:${seconds.toString().padStart(5, '0')}`;};
const normalizeGender = (genderStr) => {  const lowerGender = (genderStr || '').toLowerCase().trim();    if (lowerGender.includes('boy') || lowerGender === 'm' || lowerGender === 'b') {  return 'B';   }  if (lowerGender.includes('girl') || lowerGender === 'f' || lowerGender === 'g') {   return 'G';    }  return 'U';};
const parseTimeToSeconds = (timeStr) => {  if (!timeStr || typeof timeStr !== 'string') return null;    const parts = timeStr.split(':');    let seconds = 0;  if (parts.length === 2) { // Handles "MM:SS.ss" format        seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);    } else if (parts.length === 1) { // Handles "SS.ss" format        seconds = parseFloat(parts[0]);    }    return isNaN(seconds) ? null : seconds;};


async function fetchAndRenderInitialMeets() {    meetsContainer.innerHTML = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div><p class="text-gray-500 text-lg ml-4">Loading meets...</p></div>`;    const q = query(collection(db, MEETS_COLLECTION), orderBy("date", "desc"), limit(MEETS_PER_PAGE));  const documentSnapshots = await getDocs(q);    lastVisibleMeet = documentSnapshots.docs[documentSnapshots.docs.length - 1];    allMeets = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));    renderMeetsList();    renderHomePageSidebar();}
async function fetchAndRenderInitialAthletes() {    const q = query(collection(db, ATHLETES_COLLECTION), orderBy("name", "asc"), limit(ITEMS_PER_PAGE));   const documentSnapshots = await getDocs(q);    lastVisibleAthlete = documentSnapshots.docs[documentSnapshots.docs.length - 1];    allAthletes = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));    renderAthletesList();}
async function fetchAndRenderAllSchools() {  const snapshot = await getDocs(collection(db, ATHLETES_COLLECTION));  const allAthleteData = snapshot.docs.map(doc => doc.data());  allSchools = [...new Set(allAthleteData.map(a => a.school).filter(s => s))].sort();    renderSchoolsList();}

const renderMeetsList = () => { if (!meetsContainer) return; meetsContainer.innerHTML = '';   if (allMeets.length === 0) {   meetsContainer.innerHTML = `<div class="text-center py-12"><p class="text-gray-500 text-lg">No meets have been uploaded yet.</p><p class="text-gray-400 mt-2">Click "Upload Meet" to get started!</p></div>`;  } else {  allMeets.forEach(meet => {   meetsContainer.appendChild(createMeetListElement(meet));   });    }};

const createMeetListElement = (meet) => {
    const item = document.createElement('div');
    item.className = 'py-3 px-4 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50';
    
    const titleGroup = document.createElement('div');
    const titleLink = document.createElement('a');
    titleLink.href = '#';
    titleLink.className = 'text-lg font-bold text-red-600 hover:underline cursor-pointer';
    titleLink.textContent = meet.name;
    titleLink.onclick = (e) => { e.preventDefault(); window.navigateToMeetPage(meet.id); };
    
    const date = document.createElement('p');
    date.className = 'text-sm text-gray-500';
    date.textContent = `${meet.venueName || ''} - ${formatDate(meet.date)}`;
    titleGroup.append(titleLink, date);
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'text-red-500 hover:text-red-700 font-semibold px-3 py-1 rounded-lg hover:bg-red-100';
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
        itemToDelete = { id: meet.id, type: 'meet' };
        // Assuming you have a deleteMessage element for the modal
        document.getElementById('deleteMessage').textContent = 'Are you sure you want to delete this meet and all its associated races and results? This action cannot be undone.';
        openModal(document.getElementById('deleteModal'), document.getElementById('deleteModalBackdrop'));
    };
    
    item.append(titleGroup, deleteButton);
    return item;
};

const renderHomePageSidebar = () => {
    const container = document.getElementById('sidebarContainer');
    if (!container) return;
    const sortedMeets = [...allMeets].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentMeets = sortedMeets.slice(0, 10);
    let sidebarHTML = `
        <div class="mb-6">
            <h3 class="text-xl font-bold text-gray-800 mb-2">Westmont Stats</h3>
            <a href="#" onclick="window.navigateToSchoolRoster('Westmont')" class="text-red-600 hover:underline font-semibold">View Full Team Page &rarr;</a>
        </div>
        <div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Recent Meets</h3>
            <ul class="space-y-2">
    `;
    if (recentMeets.length > 0) {
        recentMeets.forEach(meet => {
            sidebarHTML += `<li><a href="#" onclick="window.navigateToMeetPage('${meet.id}')" class="text-gray-700 hover:text-red-600 hover:underline">${meet.name}</a></li>`;
        });
    } else {
        sidebarHTML += `<li class="text-sm text-gray-500">No meets uploaded yet.</li>`;
    }
    sidebarHTML += `</ul></div>`;
    container.innerHTML = sidebarHTML;
};

const renderAthletesList = (searchTerm = '') => {
    const container = document.getElementById('athletesContainer');
    if (!container) return;
    
    const filteredAthletes = allAthletes.filter(athlete => athlete.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filteredAthletes.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">No athletes found.</p>`;
        return;
    }
    
    container.innerHTML = ''; // Clear previous results
    const list = document.createElement('div');
    list.className = 'divide-y divide-gray-200';
    
    filteredAthletes.forEach(athlete => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'p-4 flex justify-between items-center hover:bg-gray-50';
        item.onclick = (e) => { e.preventDefault(); window.navigateToAthletePage(athlete.id, 'athletes'); };
        const genderIcon = athlete.gender === 'G' ? '♀️' : athlete.gender === 'B' ? '♂️' : '👤';
        item.innerHTML = `<div><p class="font-semibold text-gray-800">${athlete.name} <span class="text-sm">${genderIcon}</span></p><p class="text-sm text-gray-500">${athlete.school} - Class of ${athlete.gradYear || 'N/A'}</p></div>`;
        list.appendChild(item);
    });
    
    container.appendChild(list);
};

const renderSchoolsList = (searchTerm = '') => {
    const container = document.getElementById('schoolsContainer');
    if (!container) return;

    const filteredSchools = allSchools.filter(school => school.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filteredSchools.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">No schools found.</p>`;
        return;
    }
    
    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'divide-y divide-gray-200';
    
    filteredSchools.forEach(school => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'p-4 block hover:bg-gray-50';
        item.innerHTML = `<p class="font-semibold text-gray-800">${school}</p>`;
        item.onclick = (e) => { e.preventDefault(); window.navigateToSchoolRoster(school); };
        list.appendChild(item);
    });
    
    container.appendChild(list);
};

const renderMeetPage = (meetId) => {
    const meet = allMeets.find(m => m.id === meetId);
    if (!meet) {
        console.error("Meet not found");
        showView('meets');
        return;
    }
    currentMeetCache = meet;
    
    const meetPageTitle = document.getElementById('meetPageTitle');
    if(meetPageTitle) meetPageTitle.textContent = meet.name;

    const container = document.getElementById('meetPageRacesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    const racesForMeet = allRaces.filter(r => r.meetId === meetId).sort((a,b) => a.name.localeCompare(b.name));
    
    if (racesForMeet.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">No races found for this meet.</p>`;
        return;
    }
    
    racesForMeet.forEach(race => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'p-4 block border-b hover:bg-gray-50';
        item.onclick = (e) => { e.preventDefault(); window.navigateToResults(race.id); };
        item.innerHTML = `<p class="font-semibold text-gray-800">${race.name}</p><p class="text-sm text-gray-500">${race.courseName}</p>`;
        container.appendChild(item);
    });
};


const renderSingleRaceView = async (raceId) => {
    resultsCurrentPage = 1;
    const race = allRaces.find(r => r.id === raceId);
    if (!race) {
        console.error("Race not found!");
        return;
    }
    const meet = allMeets.find(m => m.id === race.meetId);
    
    const resultsRaceTitle = document.getElementById('resultsRaceTitle');
    const resultsRaceInfo = document.getElementById('resultsRaceInfo');
    const resultsTableContainer = document.getElementById('resultsTableContainer');
    
    if(resultsRaceTitle) resultsRaceTitle.textContent = race.name;
    if(resultsRaceInfo) {
        resultsRaceInfo.innerHTML = '';
        const meetLink = document.createElement('a');
        meetLink.href = '#';
        meetLink.className = 'hover:underline';
        meetLink.textContent = meet ? meet.name : 'Unknown Meet';
        meetLink.onclick = (e) => { e.preventDefault(); window.navigateToMeetPage(meet.id); };
        resultsRaceInfo.append(meetLink, ` - ${formatDate(race.date)}`);
    }
    
    if(resultsTableContainer) resultsTableContainer.innerHTML = `<div class="table-loading-spinner"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div></div>`;
    
    const q = query(collection(db, RESULTS_COLLECTION), where("raceId", "==", raceId));
    try {
        const querySnapshot = await getDocs(q);
        raceResultsCache = querySnapshot.docs.map(doc => doc.data());
        renderRaceResultsPage(race);
    } catch(error) {
        console.error(`Error fetching results for race ${race.name}:`, error);
        if(resultsTableContainer) resultsTableContainer.innerHTML = `<p class="p-6 text-center text-red-500">Could not load results.</p>`;
    }
};

function renderRaceResultsPage(race) {
    const resultsTableContainer = document.getElementById('resultsTableContainer');
    const resultsTableContainerWrapper = document.getElementById('resultsTableContainerWrapper');
    if(!resultsTableContainer || !resultsTableContainerWrapper) return;

    const sortedResults = [...raceResultsCache].sort((a, b) => {
        const valA = resultsSort.column === 'place' ? parseInt(a.place, 10) || Infinity : (resultsSort.column === 'time' ? parseTimeToSeconds(a.time) : a[resultsSort.column]);
        const valB = resultsSort.column === 'place' ? parseInt(b.place, 10) || Infinity : (resultsSort.column === 'time' ? parseTimeToSeconds(b.time) : b[resultsSort.column]);
        if (valA < valB) return resultsSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return resultsSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    resultsTableContainerWrapper.scrollTop = 0;
    
    if (sortedResults.length === 0) {
        resultsTableContainer.innerHTML = `<p class="p-6 text-center text-gray-500">No results found for this race.</p>`;
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200 sticky-header';
    table.innerHTML = `<thead class="bg-gray-100"><tr><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sortable-header" data-sort="place">Place</th><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Athlete</th><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Grade</th><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">School</th><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sortable-header" data-sort="time">Time</th></tr></thead><tbody class="bg-white divide-y divide-gray-200"></tbody>`;
    const tbody = table.querySelector('tbody');
    
    sortedResults.forEach(result => {
        const row = tbody.insertRow();
        const athleteData = allAthletes.find(a => a.id === result.athleteId);
        const athleteName = athleteData ? athleteData.name : 'Unknown Athlete';
        row.innerHTML = `<td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${result.place || ''}</td><td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-800"><a href="#" onclick="window.navigateToAthletePage('${result.athleteId}', 'results'); return false;" class="hover:underline text-red-600">${athleteName}</a></td><td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${result.grade || ''}</td><td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600"><a href="#" onclick="window.navigateToSchoolRoster('${result.school}'); return false;" class="hover:underline">${result.school}</a></td><td class="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${result.time || ''}</td>`;
    });
    
    resultsTableContainer.innerHTML = '';
    resultsTableContainer.appendChild(table);
    
    table.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (resultsSort.column === column) {
                resultsSort.direction = resultsSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                resultsSort.column = column;
                resultsSort.direction = 'asc';
            }
            resultsCurrentPage = 1;
            renderRaceResultsPage(race);
        });
    });
}



const renderAthleteResults = async (athleteId) => {
    const athlete = allAthletes.find(a => a.id === athleteId);
    if (!athlete) {
        console.error("Athlete not found");
        return;
    }
    
    showView('athleteResults');
    
    const athleteResultsTitle = document.getElementById('athleteResultsTitle');
    const athleteResultsSubtitle = document.getElementById('athleteResultsSubtitle');
    const athleteResultsContainer = document.getElementById('athleteResultsContainer');
    const summaryContainer = document.getElementById('summaryStatsContainer');
    const prContainer = document.getElementById('personalRecordsContainer');
    const sbContainer = document.getElementById('seasonBestsContainer');
    
    if(athleteResultsTitle) athleteResultsTitle.textContent = athlete.name;
    if(athleteResultsSubtitle) athleteResultsSubtitle.textContent = `${athlete.school} - Class of ${athlete.gradYear || 'N/A'}`;
    
    const loadingSpinner = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div></div>`;
    if(athleteResultsContainer) athleteResultsContainer.innerHTML = loadingSpinner;
    if(summaryContainer) summaryContainer.innerHTML = loadingSpinner;
    if(prContainer) prContainer.innerHTML = loadingSpinner;
    if(sbContainer) sbContainer.innerHTML = loadingSpinner;
    
    if (athleteChart) athleteChart.destroy();
    
    const q = query(collection(db, RESULTS_COLLECTION), where("athleteId", "==", athleteId));
    const querySnapshot = await getDocs(q);
    athleteResultsCache = querySnapshot.docs.map(doc => doc.data()).sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));

    if (athleteResultsCache.length === 0) {
        if(athleteResultsContainer) athleteResultsContainer.innerHTML = `<p class="text-center text-gray-500 py-8">No results found for this athlete.</p>`;
        if(summaryContainer) summaryContainer.innerHTML = '';
        if(prContainer) prContainer.innerHTML = '';
        if(sbContainer) sbContainer.innerHTML = '';
        return;
    }

    const getSeason = (dateStr) => new Date(dateStr).getUTCFullYear();
    const totalRaces = athleteResultsCache.length;
    const totalDistanceMeters = athleteResultsCache.reduce((sum, r) => sum + (r.distanceInMeters || 0), 0);
    const totalDistanceMiles = (totalDistanceMeters / 1609.34).toFixed(2);
    
    const personalRecords = new Map();
    athleteResultsCache.forEach(r => {
        if (r.xcTime === null || !r.distanceInMeters) return;
        if (!personalRecords.has(r.distanceInMeters) || r.xcTime < personalRecords.get(r.distanceInMeters).xcTime) {
            personalRecords.set(r.distanceInMeters, r);
        }
    });

    const seasonBests = new Map();
    athleteResultsCache.forEach(r => {
        if (r.xcTime === null) return;
        const season = getSeason(r.raceDate);
        if (!seasonBests.has(season) || r.xcTime < seasonBests.get(season).xcTime) {
            seasonBests.set(season, r);
        }
    });

    if(summaryContainer) summaryContainer.innerHTML = `<h3 class="font-bold text-lg text-gray-800 mb-2">Career Summary</h3><div class="space-y-1 text-gray-600"><p><strong>${totalRaces}</strong> Races</p><p><strong>${totalDistanceMiles}</strong> Miles Competed</p></div>`;
    if(prContainer) {
        prContainer.innerHTML = '<h3 class="font-bold text-lg text-gray-800 mb-2">Personal Records</h3>';
        const prList = document.createElement('div');
        prList.className = 'space-y-1 text-gray-600';
        if (personalRecords.size > 0) {
            [...personalRecords.entries()].sort((a,b) => a[0] - b[0]).forEach(([distance, result]) => {
                prList.innerHTML += `<p><strong>${distance}m:</strong> ${result.time}</p>`;
            });
        } else { prList.innerHTML = `<p>No records found.</p>`; }
        prContainer.appendChild(prList);
    }
    if(sbContainer) {
        sbContainer.innerHTML = '<h3 class="font-bold text-lg text-gray-800 mb-2">Season Bests (xcTime)</h3>';
        const sbList = document.createElement('div');
        sbList.className = 'space-y-1 text-gray-600';
        if (seasonBests.size > 0) {
            [...seasonBests.entries()].sort((a,b) => b[0] - a[0]).forEach(([season, result]) => {
                sbList.innerHTML += `<p><strong>${season}:</strong> ${formatSecondsToTime(result.xcTime)}</p>`;
            });
        } else { sbList.innerHTML = `<p>No records found.</p>`; }
        sbContainer.appendChild(sbList);
    }
    
    renderAthleteChart(athleteResultsCache);
    renderAthleteResultsTable();
};

function renderAthleteResultsTable() {
    const athleteResultsContainer = document.getElementById('athleteResultsContainer');
    if (!athleteResultsContainer) return;
    
    athleteResultsContainer.innerHTML = '';
    
    const sortedResults = [...athleteResultsCache].sort((a, b) => {
        const valA = a[athleteResultsSort.column];
        const valB = b[athleteResultsSort.column];
        if (valA === null) return 1;
        if (valB === null) return -1;
        if (valA < valB) return athleteResultsSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return athleteResultsSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (sortedResults.length === 0) {
        athleteResultsContainer.innerHTML = `<p class="text-center text-gray-500 py-8">No matching results found.</p>`;
        return;
    }

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `<thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="raceDate">Date</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meet</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Race</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="name">Course</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="xcTime">XC Time</th></tr></thead><tbody class="bg-white divide-y divide-gray-200"></tbody>`;
    
    const tbody = table.querySelector('tbody');
    sortedResults.forEach(r => {
        const row = tbody.insertRow();
        row.innerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatShortDate(r.raceDate)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${r.meetName}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${r.raceName}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.name}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.place || ''}</td><td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${r.time || 'N/A'}</td><td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">${formatSecondsToTime(r.xcTime)}</td>`;
    });
    athleteResultsContainer.appendChild(table);

    table.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (athleteResultsSort.column === column) {
                athleteResultsSort.direction = athleteResultsSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                athleteResultsSort.column = column;
                athleteResultsSort.direction = 'asc';
            }
            renderAthleteResultsTable();
        });
    });
}

function renderAthleteChart(results) {
    const ctx = document.getElementById('athleteChart')?.getContext('2d');
    if (!ctx) return;

    const chartData = results.map(r => ({ x: new Date(r.raceDate), y: r.xcTime })).filter(d => d.y !== null).sort((a, b) => a.x - b.x);
    const labels = chartData.map(d => formatShortDate(d.x));
    const dataPoints = chartData.map(d => d.y);

    if (athleteChart) {
        athleteChart.destroy();
    }
    
    athleteChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'xcTime Performance',
                data: dataPoints,
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            scales: {
                x: { type: 'category', title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: 'xcTime (lower is better)' }, ticks: { callback: value => formatSecondsToTime(value) } }
            },
            plugins: {
                tooltip: { callbacks: { label: (context) => `xcTime: ${formatSecondsToTime(context.raw)}` } }
            }
        }
    });
}

const renderTop50View = (schoolName) => {
    const top50Title = document.getElementById('top50Title');
    const top50CourseSelect = document.getElementById('top50CourseSelect');
    const top50GenderSelect = document.getElementById('top50GenderSelect');
    const top50GradeSelect = document.getElementById('top50GradeSelect');
    if (!top50Title || !top50CourseSelect) return;

    currentSchoolForRoster = schoolName;
    top50Title.textContent = `Top 50 XC Times - ${schoolName}`;
    
    top50CourseSelect.innerHTML = '<option value="All">All Courses</option>';
    allCourses.forEach(c => top50CourseSelect.add(new Option(`${c.name} (${c.distanceInMeters}m)`, c.id)));
    
    [top50CourseSelect, top50GenderSelect, top50GradeSelect].forEach(el => el.addEventListener('change', () => calculateAndRenderTop50(schoolName)));
    calculateAndRenderTop50(schoolName);
};

const calculateAndRenderTop50 = async (schoolName) => {
    const top50Container = document.getElementById('top50Container');
    const top50CourseSelect = document.getElementById('top50CourseSelect');
    const top50GenderSelect = document.getElementById('top50GenderSelect');
    const top50GradeSelect = document.getElementById('top50GradeSelect');
    if (!top50Container) return;

    top50Container.innerHTML = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div></div>`;
    
    const courseId = top50CourseSelect.value;
    const gender = top50GenderSelect.value;
    const grade = top50GradeSelect.value;
    
    let conditions = [where("school", "==", schoolName)];
    if (courseId !== 'All') conditions.push(where("courseId", "==", courseId));
    if (gender !== 'All') conditions.push(where("gender", "==", gender));
    if (grade !== 'All') {
        const currentYear = new Date().getFullYear();
        const gradYear = currentYear + (12 - parseInt(grade)) + (new Date().getMonth() > 6 ? 1 : 0);
        conditions.push(where("gradYear", "==", gradYear));
    }
    
    const q = query(collection(db, RESULTS_COLLECTION), ...conditions);
    try {
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(d => d.data());
        
        const bestPerformances = new Map();
        results.forEach(result => {
            if (result.xcTime === null) return;
            if (!bestPerformances.has(result.athleteId) || result.xcTime < bestPerformances.get(result.athleteId).xcTime) {
                bestPerformances.set(result.athleteId, result);
            }
        });

        const rankedPerformances = [...bestPerformances.values()]
            .sort((a, b) => a.xcTime - b.xcTime)
            .slice(0, 50);

        if (rankedPerformances.length === 0) {
            top50Container.innerHTML = `<p class="text-center text-gray-500 py-8">No matching results found.</p>`;
            return;
        }
        
        let tableHTML = `<table class="min-w-full divide-y divide-gray-200">...</table>`; // (Your table HTML structure)
        top50Container.innerHTML = tableHTML;

    } catch(e) {
        console.error("Error getting Top 50:", e);
        top50Container.innerHTML = `<p class="text-center text-red-500 py-8">Error loading data.</p>`;
    }
};

const navigateToSchoolRankings = async (schoolName) => {
    const schoolRankingsTitle = document.getElementById('schoolRankingsTitle');
    const schoolRankingsContainer = document.getElementById('schoolRankingsContainer');
    const rankingsSeasonSelect = document.getElementById('rankingsSeasonSelect');
    if (!schoolRankingsTitle || !schoolRankingsContainer) return;

    currentSchoolForRoster = schoolName;
    schoolRankingsTitle.textContent = `${schoolName} Season Rankings`;
    schoolRankingsContainer.innerHTML = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div></div>`;
    showView('schoolRankings');

    const q = query(collection(db, RESULTS_COLLECTION), where("school", "==", schoolName));
    const snapshot = await getDocs(q);
    seasonRankingsCache = snapshot.docs.map(d => d.data());

    const seasons = [...new Set(seasonRankingsCache.map(r => new Date(r.raceDate).getUTCFullYear()))].sort((a, b) => b - a);
    rankingsSeasonSelect.innerHTML = '';
    seasons.forEach(s => rankingsSeasonSelect.add(new Option(s, s)));
    
    if (seasons.length > 0) {
        rankingsSeasonSelect.value = Math.max(...seasons);
    }

    calculateAndRenderSchoolRankings();
};

const calculateAndRenderSchoolRankings = () => {
    // ... (This function appears to be complete in your last full file submission)
};


const navigateToTeamRankings = async () => {
    const teamRankingsContainer = document.getElementById('teamRankingsContainer');
    const teamRankingsSeasonSelect = document.getElementById('teamRankingsSeasonSelect');
    const teamRankingsCourseSelect = document.getElementById('teamRankingsCourseSelect');
    if (!teamRankingsContainer) return;

    showView('teamRankings');
    teamRankingsContainer.innerHTML = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div></div>`;
    
    const snapshot = await getDocs(collection(db, RESULTS_COLLECTION));
    teamRankingsCache = snapshot.docs.map(d => d.data());

    const seasons = [...new Set(teamRankingsCache.map(r => new Date(r.raceDate).getUTCFullYear()))].sort((a, b) => b - a);
    teamRankingsSeasonSelect.innerHTML = '';
    seasons.forEach(s => teamRankingsSeasonSelect.add(new Option(s, s)));
    if (seasons.length > 0) {
        teamRankingsSeasonSelect.value = Math.max(...seasons);
    }
    
    teamRankingsCourseSelect.innerHTML = '<option value="All">All Courses</option>';
    allCourses.forEach(c => teamRankingsCourseSelect.add(new Option(`${c.name} (${c.distanceInMeters}m)`, c.id)));

    calculateAndRenderTeamRankings();
};

const calculateAndRenderTeamRankings = () => {
    // ... (This function also appears complete in your last full file submission)
};

const handleCsvFile = (fileContent) => {
    try {
        const { headers, rows } = Papa.parse(fileContent, { header: true, skipEmptyLines: true, dynamicTyping: true });
        // (This function's body is complete in your reference file)
    } catch (error) {
        console.error("An error occurred in handleCsvFile:", error);
        alert("A critical error occurred while parsing the CSV.");
    }
};

const analyzeResultsWithAI = async (text) => {
    // (This function's body is complete in your reference file)
};

csvUploadInput.addEventListener('change', (event) => { /* ... your event listener code ... */ });
pdfUploadInput.addEventListener('change', async (event) => { /* ... your event listener code ... */ });

const renderDetectedRaces = () => {
    // (This function's body is complete in your reference file)
};

importSelectedRacesBtn.addEventListener('click', async () => {
    // (This function's body is complete in your reference file)
});

const calculateXcTime = (rawTimeSeconds, courseDifficulty) => {
    if (rawTimeSeconds === null || isNaN(rawTimeSeconds) || courseDifficulty === null || isNaN(courseDifficulty) || courseDifficulty === 0) {
        return null;
    }
    return rawTimeSeconds / courseDifficulty;
};

const getGraduationYear = (raceDate, grade) => {
    const year = new Date(raceDate).getUTCFullYear();
    const num = parseInt(grade, 10);
    if (isNaN(num) || num < 9 || num > 12) return null;
    return year + (12 - num) + (new Date(raceDate).getUTCMonth() > 6 ? 1 : 0);
};

const findOrCreateAthlete = (name, school, grade, gender, raceDate, batch, existingAthletes) => {
    // (This function's body is complete in your reference file)
};

const processAndAddRace = (meetId, meetName, raceName, date, data, courseId, batch, existingAthletes) => {
    // (This function's body is complete in your reference file)
};






// =================================================================
// PART 2: THE MAIN APPLICATION BLOCK
// This code waits for the HTML to be fully loaded before running.
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

// --- DOM Elements (Defined only AFTER the DOM is loaded) ---
const allViews = { meets: document.getElementById('meetsListView'), meetPage: document.getElementById('meetPageView'), results: document.getElementById('resultsView'), schools: document.getElementById('schoolsView'), athletes: document.getElementById('athletesView'), schoolRoster: document.getElementById('schoolRosterView'), athleteResults: document.getElementById('athleteResultsView'), top50: document.getElementById('top50View'), schoolRankings: document.getElementById('schoolRankingsView'), teamRankings: document.getElementById('teamRankingsView') };
const allNavLinks = { meets: document.getElementById('meetsNav'), teams: document.getElementById('teamsNav'), schools: document.getElementById('schoolsNav'), athletes: document.getElementById('athletesNav') };
const homeNav = document.getElementById('homeNav');
const backToMeetsBtn = document.getElementById('backToMeetsBtn');
const backToMeetBtn = document.getElementById('backToMeetBtn');
const resultsRaceTitle = document.getElementById('resultsRaceTitle');
const resultsRaceInfo = document.getElementById('resultsRaceInfo');
const resultsTableContainer = document.getElementById('resultsTableContainer');
const uploadMeetBtn = document.getElementById('uploadMeetBtn');
const uploadModal = document.getElementById('uploadModal');
const uploadModalBackdrop = document.getElementById('uploadModalBackdrop');
const cancelUpload = document.getElementById('cancelUpload');
const uploadForm = document.getElementById('uploadForm');
const meetsContainer = document.getElementById('meetsContainer');
const meetPageTitle = document.getElementById('meetPageTitle');
const meetPageRacesContainer = document.getElementById('meetPageRacesContainer');
const deleteModal = document.getElementById('deleteModal');
const deleteModalBackdrop = document.getElementById('deleteModalBackdrop');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
const deleteMessage = document.getElementById('deleteMessage');
const manageCoursesBtn = document.getElementById('manageCoursesBtn');
const coursesModal = document.getElementById('coursesModal');
const coursesModalBackdrop = document.getElementById('coursesModalBackdrop');
const closeCoursesModal = document.getElementById('closeCoursesModal');
const courseForm = document.getElementById('courseForm');
const coursesListContainer = document.getElementById('coursesListContainer');
const pdfUploadInput = document.getElementById('pdfUploadInput');
const csvUploadInput = document.getElementById('csvUploadInput');
const aiProcessingOverlay = document.getElementById('aiProcessingOverlay');
const raceConfirmationModal = document.getElementById('raceConfirmationModal');
const raceConfirmationModalBackdrop = document.getElementById('raceConfirmationModalBackdrop');
const detectedRacesContainer = document.getElementById('detectedRacesContainer');
const cancelRaceConfirmation = document.getElementById('cancelRaceConfirmation');
const importSelectedRacesBtn = document.getElementById('importSelectedRacesBtn');
const schoolSearchInput = document.getElementById('schoolSearchInput');
const schoolsContainer = document.getElementById('schoolsContainer');
const athleteSearchInput = document.getElementById('athleteSearchInput');
const athletesContainer = document.getElementById('athletesContainer');
const predictRaceBtn = document.getElementById('predictRaceBtn');
const predictionModal = document.getElementById('predictionModal');
const predictionModalBackdrop = document.getElementById('predictionModalBackdrop');
const closePredictionModal = document.getElementById('closePredictionModal');
const predictCourseSelect = document.getElementById('predictCourseSelect');
const predictionResultContainer = document.getElementById('predictionResultContainer');
const predictedTimeText = document.getElementById('predictedTimeText');
const predictedRangeText = document.getElementById('predictedRangeText');
const loadMoreMeetsBtn = document.getElementById('loadMoreMeetsBtn');
const loadMoreAthletesBtn = document.getElementById('loadMoreAthletesBtn');
const schoolRosterTitle = document.getElementById('schoolRosterTitle');
const schoolRosterContainer = document.getElementById('schoolRosterContainer');
const backToSchoolsBtn = document.getElementById('backToSchoolsBtn');
const top50Btn = document.getElementById('top50Btn');
const athleteResultsTitle = document.getElementById('athleteResultsTitle');
const athleteResultsSubtitle = document.getElementById('athleteResultsSubtitle');
const athleteResultsContainer = document.getElementById('athleteResultsContainer');
const backToSourceBtn = document.getElementById('backToSourceBtn');
const top50Title = document.getElementById('top50Title');
const backToRosterBtn = document.getElementById('backToRosterBtn');
const top50CourseSelect = document.getElementById('top50CourseSelect');
const top50GenderSelect = document.getElementById('top50GenderSelect');
const top50GradeSelect = document.getElementById('top50GradeSelect');
const top50Container = document.getElementById('top50Container');
const schoolRankingsTitle = document.getElementById('schoolRankingsTitle');
const backToRosterFromRankingsBtn = document.getElementById('backToRosterFromRankingsBtn');
const schoolRankingsContainer = document.getElementById('schoolRankingsContainer');
const rankingsSeasonSelect = document.getElementById('rankingsSeasonSelect');
const rankingsGenderSelect = document.getElementById('rankingsGenderSelect');
const rankingsGradeSelect = document.getElementById('rankingsGradeSelect');
const rankingsMetricSelect = document.getElementById('rankingsMetricSelect');
const teamRankingsContainer = document.getElementById('teamRankingsContainer');
const teamRankingsSeasonSelect = document.getElementById('teamRankingsSeasonSelect');
const teamRankingsGenderSelect = document.getElementById('teamRankingsGenderSelect');
const teamRankingsCourseSelect = document.getElementById('teamRankingsCourseSelect');
//removed this lineconst renderCoursesList = () => {  const coursesListContainer = document.getElementById('coursesListContainer');    if (!coursesListContainer) return;   coursesListContainer.innerHTML = '';  const list = document.createElement('ul');  list.className = 'space-y-2'; allCourses.forEach(course => {  const item = document.createElement('li');   item.className = 'p-2 bg-white rounded border';  item.innerHTML = `   <div>  <p class="font-semibold text-gray-800">${course.name}</p> <p class="text-xs text-gray-500">   ${course.distanceInMeters}m | Difficulty: ${course.difficulty} | Range: ${course.range || 'N/A'} </p>   </div>`;   list.appendChild(item); });   coursesListContainer.appendChild(list);};

    // --- All Functions that interact with the DOM ---
    const showView = (viewName) => {
    Object.values(allViews).forEach(v => v.style.display = 'none');
    Object.values(allNavLinks).forEach(l => l.classList.remove('active'));
    if (allViews[viewName]) allViews[viewName].style.display = 'block';
    const navMap = { meets: 'meets', meetPage: 'meets', /* ...etc... */ };
    const activeNav = navMap[viewName] || 'meets';
    if(allNavLinks[activeNav]) allNavLinks[activeNav].classList.add('active');
};

    const renderMeetsList = () => {
    if (!meetsContainer) return;
    meetsContainer.innerHTML = ''; // Clear the container first
    
    if (allMeets.length === 0) {
        meetsContainer.innerHTML = `<div class="text-center py-12"><p class="text-gray-500 text-lg">No meets have been uploaded yet.</p><p class="text-gray-400 mt-2">Click "Upload Meet" to get started!</p></div>`;
    } else {
        allMeets.forEach(meet => {
            meetsContainer.appendChild(createMeetListElement(meet));
        });
    }
};

const createMeetListElement = (meet) => {
    const item = document.createElement('div');
    item.className = 'py-3 px-4 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50';
    
    const titleGroup = document.createElement('div');
    const titleLink = document.createElement('a');
    titleLink.href = '#';
    titleLink.className = 'text-lg font-bold text-red-600 hover:underline cursor-pointer';
    titleLink.textContent = meet.name;
    titleLink.onclick = (e) => { e.preventDefault(); window.navigateToMeetPage(meet.id); };
    
    const date = document.createElement('p');
    date.className = 'text-sm text-gray-500';
    date.textContent = `${meet.venueName || ''} - ${formatDate(meet.date)}`;
    titleGroup.append(titleLink, date);
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'text-red-500 hover:text-red-700 font-semibold px-3 py-1 rounded-lg hover:bg-red-100';
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
        itemToDelete = { id: meet.id, type: 'meet' };
        document.getElementById('deleteMessage').textContent = 'Are you sure you want to delete this meet and all its associated races and results? This action cannot be undone.';
        openModal(document.getElementById('deleteModal'), document.getElementById('deleteModalBackdrop'));
    };
    
    item.append(titleGroup, deleteButton);
    return item;
};

        const parseTimeToSeconds = (timeStr) => {
            if (!timeStr || typeof timeStr !== 'string') return null;
            const parts = timeStr.split(':');
            let seconds = 0;
            if (parts.length === 2) { seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]); } else if (parts.length === 1) { seconds = parseFloat(parts[0]); }
            return isNaN(seconds) ? null : seconds;
        };
        const renderMeetPage = (meetId) => {
            const meet = allMeets.find(m => m.id === meetId);
            if (!meet) { console.error("Meet not found"); showView('meets'); return; }
            currentMeetCache = meet;
            meetPageTitle.textContent = meet.name;
            const container = meetPageRacesContainer;
            container.innerHTML = '';
            const racesForMeet = allRaces.filter(r => r.meetId === meetId).sort((a,b) => a.name.localeCompare(b.name));
            if (racesForMeet.length === 0) { container.innerHTML = `<p class="text-center text-gray-500 py-8">No races found for this meet.</p>`; return; }
            racesForMeet.forEach(race => {
                const item = document.createElement('a'); item.href = '#';
                item.className = 'p-4 block border-b hover:bg-gray-50';
                item.onclick = (e) => { e.preventDefault(); window.navigateToResults(race.id); };
                item.innerHTML = `<p class="font-semibold text-gray-800">${race.name}</p><p class="text-sm text-gray-500">${race.courseName}</p>`;
                container.appendChild(item);
            });
        };
        const renderSingleRaceView = async (raceId) => {
            resultsCurrentPage = 1;
            const race = allRaces.find(r => r.id === raceId);
            if (!race) { console.error("Race not found!"); return; }
            const meet = allMeets.find(m => m.id === race.meetId);
            resultsRaceTitle.textContent = race.name;
            resultsRaceInfo.innerHTML = '';
            const meetLink = document.createElement('a');
            meetLink.href = '#';
            meetLink.className = 'hover:underline';
            meetLink.textContent = meet ? meet.name : 'Unknown Meet';
            meetLink.onclick = (e) => { e.preventDefault(); window.navigateToMeetPage(meet.id); };
            resultsRaceInfo.append(meetLink, ` - ${formatDate(race.date)}`);
            
            resultsTableContainer.innerHTML = `<div class="table-loading-spinner"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div></div>`;
            const q = query(collection(db, RESULTS_COLLECTION), where("raceId", "==", raceId));
            try {
                const querySnapshot = await getDocs(q);
                raceResultsCache = querySnapshot.docs.map(doc => doc.data());
                renderRaceResultsPage(race);
            } catch(error) { console.error(`Error fetching results for race ${race.name}:`, error); resultsTableContainer.innerHTML = `<p class="p-6 text-center text-red-500">Could not load results.</p>`; }
        };
        function renderRaceResultsPage(race) {
            const sortedResults = [...raceResultsCache].sort((a, b) => {
                const valA = resultsSort.column === 'place' ? parseInt(a.place, 10) || Infinity : (resultsSort.column === 'time' ? parseTimeToSeconds(a.time) : a[resultsSort.column]);
                const valB = resultsSort.column === 'place' ? parseInt(b.place, 10) || Infinity : (resultsSort.column === 'time' ? parseTimeToSeconds(b.time) : b[resultsSort.column]);
                if (valA < valB) return resultsSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return resultsSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
            resultsTableContainerWrapper.scrollTop = 0;
            const startIndex = (resultsCurrentPage - 1) * RESULTS_PER_PAGE;
            const endIndex = startIndex + RESULTS_PER_PAGE;
            const paginatedResults = sortedResults.slice(startIndex, endIndex);
            if (paginatedResults.length === 0) {
                resultsTableContainer.innerHTML = `<p class="p-6 text-center text-gray-500">No results found for this race.</p>`;
                return;
            }
            const table = document.createElement('table');
            table.className = 'min-w-full divide-y divide-gray-200 sticky-header';
            table.innerHTML = `<thead class="bg-gray-100"><tr><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sortable-header" data-sort="place">Place</th><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Athlete</th><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Grade</th><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">School</th><th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sortable-header" data-sort="time">Time</th></tr></thead><tbody class="bg-white divide-y divide-gray-200"></tbody>`;
            const tbody = table.querySelector('tbody');
            paginatedResults.forEach(result => {
                const row = tbody.insertRow();
                const athleteData = allAthletes.find(a => a.id === result.athleteId);
                const athleteName = athleteData ? athleteData.name : 'Unknown Athlete';
                row.innerHTML = `<td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${result.place || ''}</td><td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-800"><a href="#" onclick="window.navigateToAthletePage('${result.athleteId}', 'results'); return false;" class="hover:underline text-red-600">${athleteName}</a></td><td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${result.grade || ''}</td><td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600"><a href="#" onclick="window.navigateToSchoolRoster('${result.school}'); return false;" class="hover:underline">${result.school}</a></td><td class="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${result.time || ''}</td>`;
            });
            resultsTableContainer.innerHTML = '';
            resultsTableContainer.appendChild(table);
            table.querySelectorAll('.sortable-header').forEach(header => {
                header.addEventListener('click', () => {
                    const column = header.dataset.sort;
                    if (resultsSort.column === column) {
                        resultsSort.direction = resultsSort.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        resultsSort.column = column;
                        resultsSort.direction = 'asc';
                    }
                    resultsCurrentPage = 1;
                    renderRaceResultsPage(race);
                });
            });
        }
      
        // --- Course Management ---
courseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const distance = parseFloat(document.getElementById('courseDistance').value);
    const unit = document.getElementById('distanceUnit').value;
    
    const newCourse = {
        name: document.getElementById('courseName').value,
        distanceInMeters: Math.round(unit === 'miles' ? distance * 1609.34 : distance),
        difficulty: parseFloat(document.getElementById('courseDifficulty').value),
        range: parseFloat(document.getElementById('courseRange').value) || 0.02 // Default range to 2%
    };
    
    try {
        await addDoc(collection(db, COURSES_COLLECTION), newCourse);
        courseForm.reset();
    } catch (error) {
        console.error("Error adding course:", error);
    }
});



    // ... (and ALL your other functions that interact with the DOM)

// --- All Event Listeners Go Here ---

// Navigation
homeNav.addEventListener('click', (e) => { e.preventDefault(); showView('meets'); });
allNavLinks.meets.addEventListener('click', (e) => { e.preventDefault(); showView('meets'); });
allNavLinks.schools.addEventListener('click', (e) => { e.preventDefault(); showView('schools'); });
allNavLinks.athletes.addEventListener('click', (e) => { e.preventDefault(); showView('athletes'); });
allNavLinks.teams.addEventListener('click', (e) => { e.preventDefault(); navigateToTeamRankings(); });

// Back Buttons
backToMeetsBtn.addEventListener('click', () => showView('meets'));
backToMeetBtn.addEventListener('click', () => {
    if (currentMeetCache.id) {
        window.navigateToMeetPage(currentMeetCache.id);
    } else {
        showView('meets');
    }
});
backToSchoolsBtn.addEventListener('click', () => showView('schools'));
backToRosterBtn.addEventListener('click', () => showView('schoolRoster'));
backToSourceBtn.addEventListener('click', () => {
    if (currentAthleteViewSource.view === 'top50') {
        window.navigateToTop50(currentAthleteViewSource.context);
    } else {
        showView(currentAthleteViewSource.view);
    }
});
backToRosterFromRankingsBtn.addEventListener('click', () => navigateToSchoolRoster(currentSchoolForRoster));

// Modal Triggers
uploadMeetBtn.addEventListener('click', () => openModal(uploadModal, uploadModalBackdrop));
manageCoursesBtn.addEventListener('click', () => openModal(coursesModal, coursesModalBackdrop));

// Modal Close Buttons
[cancelUpload, cancelDelete, cancelRaceConfirmation, closeCoursesModal, closePredictionModal].forEach(btn => {
    if (btn) btn.addEventListener('click', () => closeModal(btn.closest('.modal'), btn.closest('.modal').previousElementSibling));
});
[uploadModalBackdrop, coursesModalBackdrop, deleteModalBackdrop, raceConfirmationModalBackdrop, predictionModalBackdrop].forEach(b => {
    if (b) b.addEventListener('click', () => closeModal(b.nextElementSibling, b));
});




// Forms and Inputs
schoolSearchInput.addEventListener('input', (e) => renderSchoolsList(e.target.value));
athleteSearchInput.addEventListener('input', (e) => renderAthletesList(e.target.value));
courseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const distance = parseFloat(document.getElementById('courseDistance').value);
    const unit = document.getElementById('distanceUnit').value;
    const newCourse = {
        name: document.getElementById('courseName').value,
        distanceInMeters: Math.round(unit === 'miles' ? distance * 1609.34 : distance),
        difficulty: parseFloat(document.getElementById('courseDifficulty').value),
        range: parseFloat(document.getElementById('courseRange').value) || 0.02
    };
    try {
        await addDoc(collection(db, COURSES_COLLECTION), newCourse);
        courseForm.reset();
    } catch (error) {
        console.error("Error adding course:", error);
    }
});

importSelectedRacesBtn.addEventListener('click', async () => {
    const meetName = currentEventName;
    const meetDate = currentEventDate;

    if (!meetName || !meetDate) {
        alert('A valid meet name and date must be set before importing.');
        return;
    }

    const raceElements = detectedRacesContainer.querySelectorAll('div[data-race-index]');
    const btn = importSelectedRacesBtn;
    btn.disabled = true;
    btn.textContent = 'Fetching athletes...';
    let racesToImport = [];
    let hasError = false;

    raceElements.forEach(el => {
        if (el.querySelector('input[type="checkbox"]').checked) {
            const raceName = el.querySelector('input[type="text"]').value;
            const courseId = el.querySelector('select').value;
            if (!raceName || !courseId) {
                hasError = true;
            }
            racesToImport.push({
                name: raceName,
                date: `${meetDate}T00:00:00`,
                data: detectedRacesCache[parseInt(el.dataset.raceIndex, 10)].csvData,
                courseId: courseId
            });
        }
    });

    if (hasError) {
        alert("Please select a course and provide a name for every race to import.");
        btn.disabled = false;
        btn.textContent = 'Import Selected Races';
        return;
    }

    try {
        const athletesSnapshot = await getDocs(collection(db, ATHLETES_COLLECTION));
        const existingAthletes = athletesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        btn.textContent = 'Importing...';
        const batch = writeBatch(db);
        const meetDocRef = doc(collection(db, MEETS_COLLECTION));
        
        // Correctly gets the venue/location name from the text input
        const venueName = document.getElementById('meetVenue').value;

        batch.set(meetDocRef, {
            id: meetDocRef.id,
            name: meetName,
            date: `${meetDate}T00:00:00`,
            venueName: venueName,
            createdAt: new Date().toISOString()
        });

        for (const race of racesToImport) {
            processAndAddRace(meetDocRef.id, meetName, race.name, race.date, race.data, race.courseId, batch, existingAthletes);
        }
        
        await batch.commit();

    } catch (error) {
        console.error("Failed to import races:", error);
        alert("Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Import Selected Races';
        closeModal(raceConfirmationModal, raceConfirmationModalBackdrop);
    }
});

csvUploadInput.addEventListener('change', (event) => {
    if (!uploadForm.checkValidity()) {
        alert("Please fill out Meet Name, Date, and Venue / Location first.");
        event.target.value = '';
        return;
    }
    currentEventName = document.getElementById('meetName').value;
    currentEventDate = document.getElementById('meetDate').value;
    const file = event.target.files[0];
    if (!file) return;

    aiProcessingOverlay.style.display = 'flex';
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            handleCsvFile(e.target.result);
        } catch (error) {
            console.error("Error processing CSV:", error);
            alert("Could not process CSV file. The specific error is: " + error.message);
        } finally {
            aiProcessingOverlay.style.display = 'none';
        }
    };
    
    reader.onerror = () => {
        alert("Error reading CSV file.");
        aiProcessingOverlay.style.display = 'none';
    };
    
    reader.readAsText(file);
});

pdfUploadInput.addEventListener('change', async (event) => {
    if (!uploadForm.checkValidity()) {
        alert("Please fill out Meet Name, Date, and Venue / Location first.");
        event.target.value = '';
        return;
    }
    currentEventName = document.getElementById('meetName').value;
    currentEventDate = document.getElementById('meetDate').value;
    const file = event.target.files[0];
    if (!file) return;

    aiProcessingOverlay.style.display = 'flex';
    try {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
            }
            detectedRacesCache = await analyzeResultsWithAI(fullText);
            renderDetectedRaces();
            closeModal(uploadModal, uploadModalBackdrop);
            openModal(raceConfirmationModal, raceConfirmationModalBackdrop);
        };
        fileReader.readAsArrayBuffer(file);
    } catch (error) {
        console.error("Error processing PDF:", error);
        alert("Could not process PDF.");
    } finally {
        aiProcessingOverlay.style.display = 'none';
    }
});

confirmDelete.addEventListener('click', async () => {
    if (!itemToDelete) return;
    try {
        if (itemToDelete.type === 'meet') {
            await deleteMeet(itemToDelete.id);
        }
    } catch (error) {
        console.error("Error deleting item:", error);
    } finally {
        closeModal(deleteModal, deleteModalBackdrop);
        itemToDelete = null;
    }
});

// Other UI Buttons
top50Btn.addEventListener('click', () => window.navigateToTop50(currentSchoolForRoster));

predictRaceBtn.addEventListener('click', () => {
    if (!currentAthleteIdForPrediction) {
        alert("Could not identify the current athlete. Please navigate to an athlete's page first.");
        return;
    }

    // Populate the course dropdown in the modal
    predictCourseSelect.innerHTML = '<option value="">Select a course...</option>';
    allCourses.sort((a, b) => a.name.localeCompare(b.name)).forEach(course => {
        const option = new Option(`${course.name} (${course.distanceInMeters}m)`, course.id);
        predictCourseSelect.appendChild(option);
    });
    
    // Reset the result area and show the modal
    predictionResultContainer.classList.add('hidden');
    openModal(predictionModal, predictionModalBackdrop);
});

document.body.addEventListener('click', (e) => {
    if (e.target.id === 'seasonRankingsBtn') {
        navigateToSchoolRankings(currentSchoolForRoster);
    }
});

// Filter Dropdowns
[top50CourseSelect, top50GenderSelect, top50GradeSelect].forEach(el => el.addEventListener('change', () => calculateAndRenderTop50(currentSchoolForRoster)));
[rankingsSeasonSelect, rankingsGenderSelect, rankingsGradeSelect, rankingsMetricSelect].forEach(el => el.addEventListener('change', calculateAndRenderSchoolRankings));
[teamRankingsSeasonSelect, teamRankingsGenderSelect, teamRankingsCourseSelect].forEach(el => el.addEventListener('change', calculateAndRenderTeamRankings));

predictCourseSelect.addEventListener('change', async (event) => {
    const courseId = event.target.value;
    if (!courseId) {
        predictionResultContainer.classList.add('hidden');
        return;
    }

    // Call the main prediction function
    const result = await predictRaceRange(currentAthleteIdForPrediction, courseId);
    
    if (result) {
        // Display the successful prediction
        predictedTimeText.textContent = formatSecondsToTime(result.predicted);
        predictedRangeText.textContent = `(Expected Range: ${formatSecondsToTime(result.low)} - ${formatSecondsToTime(result.high)})`;
        predictionResultContainer.classList.remove('hidden');
    } else {
        // Handle cases where a prediction couldn't be made
        predictedTimeText.textContent = "Not Enough Data";
        predictedRangeText.textContent = "(At least one recent race with an xcTime is needed)";
        predictionResultContainer.classList.remove('hidden');
    }
});





    // --- Firebase Initialization & Startup ---
    async function initializeFirebase() {
        try {
            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            await signInAnonymously(auth);
            setupListeners();
            showView('meets');
        } catch (error) {
            console.error("Firebase initialization error:", error);
        }
    }
    async function fetchAndRenderInitialMeets() {
    meetsContainer.innerHTML = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div><p class="text-gray-500 text-lg ml-4">Loading meets...</p></div>`;

    const meetsCollection = collection(db, MEETS_COLLECTION);
    const q = query(meetsCollection, orderBy("date", "desc"), limit(MEETS_PER_PAGE));
    
    const documentSnapshots = await getDocs(q);

    lastVisibleMeet = documentSnapshots.docs[documentSnapshots.docs.length - 1];

    allMeets = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMeetsList();
    renderHomePageSidebar();
}
const renderHomePageSidebar = () => {
    const container = document.getElementById('sidebarContainer');
    if (!container) return;
    const sortedMeets = [...allMeets].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentMeets = sortedMeets.slice(0, 10);
    let sidebarHTML = `
        <div class="mb-6">
            <h3 class="text-xl font-bold text-gray-800 mb-2">Westmont Stats</h3>
            <a href="#" onclick="window.navigateToSchoolRoster('Westmont')" class="text-red-600 hover:underline font-semibold">View Full Team Page &rarr;</a>
        </div>
        <div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Recent Meets</h3>
            <ul class="space-y-2">
    `;
    if (recentMeets.length > 0) {
        recentMeets.forEach(meet => {
            sidebarHTML += `<li><a href="#" onclick="window.navigateToMeetPage('${meet.id}')" class="text-gray-700 hover:text-red-600 hover:underline">${meet.name}</a></li>`;
        });
    } else {
        sidebarHTML += `<li class="text-sm text-gray-500">No meets uploaded yet.</li>`;
    }
    sidebarHTML += `</ul></div>`;
    container.innerHTML = sidebarHTML;
};

    function setupListeners() {
        fetchAndRenderInitialMeets();
        fetchAndRenderInitialAthletes();
        fetchAndRenderAllSchools();

        onSnapshot(collection(db, RACES_COLLECTION), (snapshot) => {
            allRaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        onSnapshot(collection(db, COURSES_COLLECTION), (snapshot) => {
            allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name));
            renderCoursesList();
        });
    }

    // --- KICK OFF THE APP ---
    initializeFirebase();
});