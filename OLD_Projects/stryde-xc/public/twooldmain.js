// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, setLogLevel, writeBatch, query, where, getDocs, limit, updateDoc, orderBy, startAfter } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


// Make navigation functions globally accessible
window.navigateToMeetPage = (meetId) => { renderMeetPage(meetId); showView('meetPage'); };
window.navigateToResults = (raceId) => { renderSingleRaceView(raceId); showView('results'); };
window.navigateToSchoolRoster = (schoolName) => { currentSchoolForRoster = schoolName; renderSchoolRoster(schoolName); showView('schoolRoster'); };
        window.navigateToAthletePage = (athleteId, sourceView) => { 
            currentAthleteViewSource.view = sourceView; 
            if(sourceView === 'top50') currentAthleteViewSource.context = currentSchoolForRoster;
            renderAthleteResults(athleteId); 
            showView('athleteResults');
        };
        window.navigateToTop50 = (schoolName) => { renderTop50View(schoolName); showView('top50'); };
        window.navigateToSchoolRankings = (schoolName) => navigateToSchoolRankings(schoolName);

        // --- DOM Elements ---
        const allViews = { meets: document.getElementById('meetsListView'), meetPage: document.getElementById('meetPageView'), results: document.getElementById('resultsView'), schools: document.getElementById('schoolsView'), athletes: document.getElementById('athletesView'), schoolRoster: document.getElementById('schoolRosterView'), athleteResults: document.getElementById('athleteResultsView'), top50: document.getElementById('top50View'), schoolRankings: document.getElementById('schoolRankingsView'), teamRankings: document.getElementById('teamRankingsView') };
        const allNavLinks = { meets: document.getElementById('meetsNav'), teams: document.getElementById('teamsNav'), schools: document.getElementById('schoolsNav'), athletes: document.getElementById('athletesNav') };
        const homeNav = document.getElementById('homeNav');
        const backToMeetsBtn = document.getElementById('backToMeetsBtn');
        const backToMeetBtn = document.getElementById('backToMeetBtn');
        const resultsRaceTitle = document.getElementById('resultsRaceTitle');
        const resultsRaceInfo = document.getElementById('resultsRaceInfo');
        const resultsTableContainer = document.getElementById('resultsTableContainer');
        const resultsTableContainerWrapper = document.getElementById('resultsTableContainerWrapper');
        const resultsPaginationContainer = document.getElementById('resultsPaginationContainer');
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
        
        let db, auth;
        let itemToDelete = null; 
        let allCourses = [], allMeets = [], allRaces = [], allAthletes = [], allSchools = [];
        let detectedRacesCache = [];
        let currentAthleteViewSource = { view: 'athletes', context: null };
        let currentSchoolForRoster = null;
        let currentMeetCache = {};
        let currentEventName = '', currentEventDate = '';
        let athleteChart = null;
        let athleteResultsCache = [];
        let raceResultsCache = [];
        let athleteResultsSort = { column: 'raceDate', direction: 'desc' };
        let resultsSort = { column: 'place', direction: 'asc' };
        let resultsCurrentPage = 1;
        const RESULTS_PER_PAGE = 100;
        let seasonRankingsCache = [];
        let teamRankingsCache = [];



let lastVisibleMeet = null;
const MEETS_PER_PAGE = 25;

let lastVisibleAthlete = null;
let lastVisibleSchool = null;
const ITEMS_PER_PAGE = 50; // You can use a different number for these lists


        // --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyCbzV-L_jXbP30PcQMDJhSs8Zfa2v_Icg4",
    authDomain: "stryde-xc.firebaseapp.com",
    projectId: "stryde-xc",
    storageBucket: "stryde-xc.appspot.com",
    messagingSenderId: "69433034382",
    appId: "1:69433034382:web:120b886b7bde7509caabdf",
    measurementId: "G-9SCFV46E81"
};
const appId = 'stryde-xc-live';
const MEETS_COLLECTION = `artifacts/${appId}/public/data/meets`;
const RACES_COLLECTION = `artifacts/${appId}/public/data/races`;
const RESULTS_COLLECTION = `artifacts/${appId}/public/data/results`;
const COURSES_COLLECTION = `artifacts/${appId}/public/data/courses`;
const ATHLETES_COLLECTION = `artifacts/${appId}/public/data/athletes`;

// --- Firebase Initialization ---
async function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        await signInAnonymously(auth);
        if (!auth.currentUser?.uid) throw new Error("Authentication failed.");
        setupListeners();
        showView('meets');
    } catch (error) {
        console.error("Firebase initialization error:", error);
        document.body.innerHTML = `<div class="text-center p-8"><p class="text-red-500 text-lg">Failed to load application. Check console.</p></div>`;
    }
}
        
// --- Admin Sign-In Function ---
async function signInAsAdmin() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log(`Successfully signed in as admin: ${user.displayName} (${user.uid})`);
        alert(`Admin sign-in successful: Welcome, ${user.displayName}!`);
    } catch (error) {
        console.error("Admin sign-in error:", error);
        alert("Admin sign-in failed. Check the console for details.");
    }
}
// Make the function accessible from the browser console
window.signInAsAdmin = signInAsAdmin;


// NEW FUNCTION to fetch only the first page of meets
async function fetchAndRenderInitialMeets() {
    meetsContainer.innerHTML = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div><p class="text-gray-500 text-lg ml-4">Loading meets...</p></div>`;

    const meetsCollection = collection(db, MEETS_COLLECTION);
    // Create a query to get the first 25 meets, ordered by newest date first
    const q = query(meetsCollection, orderBy("date", "desc"), limit(MEETS_PER_PAGE));
    
    const documentSnapshots = await getDocs(q);

    // Save the last meet from this batch so we know where to start next time
    lastVisibleMeet = documentSnapshots.docs[documentSnapshots.docs.length - 1];

    // Process and render the meets
    allMeets = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMeetsList(); // This function you already have
    renderHomePageSidebar(); // This function you already have
}


function setupListeners() {
    fetchAndRenderInitialMeets();
    fetchAndRenderInitialAthletes(); // Typo fixed
    fetchAndRenderAllSchools();  // Add this line for the schools list

    // Keep your other listeners for races, courses, etc.
    onSnapshot(collection(db, RACES_COLLECTION), (snapshot) => {
        allRaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
    onSnapshot(collection(db, COURSES_COLLECTION), (snapshot) => {
        allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateCoursesList();
    });   
}

// Function to update the courses list in the UI
function updateCoursesList() {
    if (!coursesListContainer) return;
    coursesListContainer.innerHTML = allCourses
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(course => `
            <div class="flex items-center justify-between p-4 border-b">
                <div>
                    <h3 class="font-semibold">${course.name}</h3>
                    <p class="text-sm text-gray-500">Difficulty: ${course.difficulty || 'Not set'}</p>
                </div>
                <button onclick="deleteCourse('${course.id}')" class="text-red-600 hover:text-red-800">Delete</button>
            </div>
        `).join('');

// NEW FUNCTION to fetch only the first page of athletes
async function fetchAndRenderInitialAthletes() {
    // This query gets the first 50 athletes, ordered alphabetically by name
    const q = query(collection(db, ATHLETES_COLLECTION), orderBy("name", "asc"), limit(ITEMS_PER_PAGE));
    
    const documentSnapshots = await getDocs(q);

    // Save the last athlete from this batch so we know where to start the next page
    lastVisibleAthlete = documentSnapshots.docs[documentSnapshots.docs.length - 1];

    // Process and render the athletes
    const athletes = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // IMPORTANT: Your old code loaded ALL athletes to build the schools list.
    // Since we only load 50 here, we need to handle the global cache differently.
    allAthletes = athletes; // Only stores the first 50 for now
    renderAthletesList(); // This is your existing function to display the list
}



// NEW FUNCTION to fetch all schools
async function fetchAndRenderAllSchools() {
    // To build the schools list, we still need to get all athletes
    const snapshot = await getDocs(collection(db, ATHLETES_COLLECTION));
    const allAthleteData = snapshot.docs.map(doc => doc.data());
    
    // This logic is from your original code
    allSchools = [...new Set(allAthleteData.map(a => a.school).filter(s => s))].sort();
    renderSchoolsList(); // Your existing function to display the list
}





// --- View Navigation & Helpers ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Corrected to toLocaleDateString (only one "Date")
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const year = date.getUTCFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
};
const formatSecondsToTime = (totalSeconds) => {
    if (totalSeconds === Infinity || isNaN(totalSeconds) || totalSeconds === null) return 'N/A';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2);
    return `${minutes}:${seconds.toString().padStart(5, '0')}`;
};

        const normalizeGender = (genderStr) => {
            const lowerGender = (genderStr || '').toLowerCase().trim();
            if (lowerGender.includes('boy') || lowerGender === 'm' || lowerGender === 'b') {
                return 'B';
            }
            if (lowerGender.includes('girl') || lowerGender === 'f' || lowerGender === 'g') {
                return 'G';
            }
            return 'U';
        };
        const showView = (viewName) => {
            Object.values(allViews).forEach(v => v.style.display = 'none');
            Object.values(allNavLinks).forEach(l => l.classList.remove('active'));
            if (allViews[viewName]) allViews[viewName].style.display = 'block';
            const navMap = { meets: 'meets', meetPage: 'meets', results: 'meets', schools: 'schools', schoolRoster: 'schools', top50: 'schools', athletes: 'athletes', athleteResults: 'athletes', schoolRankings: 'schools', teamRankings: 'teams' };
            const activeNav = navMap[viewName] || 'meets';
            if(allNavLinks[activeNav]) allNavLinks[activeNav].classList.add('active');
        };
        
        const renderAthleteResults = async (athleteId) => {
            const athlete = allAthletes.find(a => a.id === athleteId);
            if (!athlete) { console.error("Athlete not found"); return; }
            showView('athleteResults'); 
            athleteResultsTitle.textContent = athlete.name;
            athleteResultsSubtitle.textContent = `${athlete.school} - Class of ${athlete.gradYear || 'N/A'}`;
            const loadingSpinner = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div></div>`;
            athleteResultsContainer.innerHTML = loadingSpinner;
            document.getElementById('summaryStatsContainer').innerHTML = loadingSpinner;
            document.getElementById('personalRecordsContainer').innerHTML = loadingSpinner;
            document.getElementById('seasonBestsContainer').innerHTML = loadingSpinner;
            if (athleteChart) athleteChart.destroy();
            
            const q = query(collection(db, RESULTS_COLLECTION), where("athleteId", "==", athleteId));
            const querySnapshot = await getDocs(q);
            athleteResultsCache = querySnapshot.docs.map(doc => doc.data()).sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));

            athleteResultsSort = { column: 'raceDate', direction: 'desc' };

            if (athleteResultsCache.length === 0) {
                athleteResultsContainer.innerHTML = `<p class="text-center text-gray-500 py-8">No results found for this athlete.</p>`;
                document.getElementById('summaryStatsContainer').innerHTML = '';
                document.getElementById('personalRecordsContainer').innerHTML = '';
                document.getElementById('seasonBestsContainer').innerHTML = '';
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

            const summaryContainer = document.getElementById('summaryStatsContainer');
            summaryContainer.innerHTML = `<h3 class="font-bold text-lg text-gray-800 mb-2">Career Summary</h3><div class="space-y-1 text-gray-600"><p><strong>${totalRaces}</strong> Races</p><p><strong>${totalDistanceMiles}</strong> Miles Competed</p></div>`;
            const prContainer = document.getElementById('personalRecordsContainer');
            prContainer.innerHTML = '<h3 class="font-bold text-lg text-gray-800 mb-2">Personal Records</h3>';
            const prList = document.createElement('div');
            prList.className = 'space-y-1 text-gray-600';
            if (personalRecords.size > 0) {
                [...personalRecords.entries()].sort((a,b) => a[0] - b[0]).forEach(([distance, result]) => {
                    prList.innerHTML += `<p><strong>${distance}m:</strong> ${result.time}</p>`;
                });
            } else { prList.innerHTML = `<p>No records found.</p>`; }
            prContainer.appendChild(prList);
            const sbContainer = document.getElementById('seasonBestsContainer');
            sbContainer.innerHTML = '<h3 class="font-bold text-lg text-gray-800 mb-2">Season Bests (xcTime)</h3>';
            const sbList = document.createElement('div');
            sbList.className = 'space-y-1 text-gray-600';
            if (seasonBests.size > 0) {
                [...seasonBests.entries()].sort((a,b) => b[0] - a[0]).forEach(([season, result]) => {
                    sbList.innerHTML += `<p><strong>${season}:</strong> ${formatSecondsToTime(result.xcTime)}</p>`;
                });
            } else { sbList.innerHTML = `<p>No records found.</p>`; }
            sbContainer.appendChild(sbList);
            renderAthleteChart(athleteResultsCache);
            renderAthleteResultsTable();
        };

        function renderAthleteResultsTable() {
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
            table.innerHTML = `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="raceDate">Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meet</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Race</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="name">Course</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="xcTime">XC Time</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200"></tbody>
            `;
            
            const tbody = table.querySelector('tbody');
            sortedResults.forEach(r => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatShortDate(r.raceDate)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${r.meetName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${r.raceName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.place || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${r.time || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">${formatSecondsToTime(r.xcTime)}</td>
                `;
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
            const ctx = document.getElementById('athleteChart').getContext('2d');
            const chartData = results.map(r => ({ x: new Date(r.raceDate), y: r.xcTime })).filter(d => d.y !== null).sort((a,b) => a.x - b.x);
            
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
                        x: { 
                            type: 'category', 
                            title: { display: true, text: 'Date' }
                        },
                        y: { 
                            title: { display: true, text: 'xcTime (lower is better)' }, 
                            ticks: { callback: value => formatSecondsToTime(value) }
                        }
                    },
                    plugins: { 
                        tooltip: { 
                            callbacks: { 
                                label: (context) => `xcTime: ${formatSecondsToTime(context.raw)}` 
                            }
                        }
                    }
                }
            });
        }

// --- Modal Logic ---
const openModal = (modal, backdrop) => { backdrop.style.display = 'block'; modal.style.display = 'block'; modal.classList.add('modal-enter'); modal.classList.remove('modal-leave'); };
const closeModal = (modal, backdrop) => {
    modal.classList.add('modal-leave'); modal.classList.remove('modal-enter');
    setTimeout(() => {
        backdrop.style.display = 'none'; modal.style.display = 'none';
        if (modal === uploadModal) { uploadForm.reset(); pdfUploadInput.value = ''; csvUploadInput.value = ''; }
        if (modal === coursesModal) courseForm.reset();
        if (modal === raceConfirmationModal) detectedRacesCache = [];
    }, 300);
};
[cancelUpload, cancelDelete, cancelRaceConfirmation, closeCoursesModal].forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal'), btn.closest('.modal').previousElementSibling)));
[uploadModalBackdrop, coursesModalBackdrop, deleteModalBackdrop, raceConfirmationModalBackdrop].forEach(b => b.addEventListener('click', () => closeModal(b.nextElementSibling, b)));

        // --- Data Snapshots and Rendering ---
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
        
        const renderMeetsList = () => {
            const container = meetsContainer;
            if (allMeets.length === 0) { container.innerHTML = `<div class="text-center py-12"><p class="text-gray-500 text-lg">No meets have been uploaded yet.</p><p class="text-gray-400 mt-2">Click "Upload Meet" to get started!</p></div>`; }
            else { container.innerHTML = ''; allMeets.forEach(meet => container.appendChild(createMeetListElement(meet))); }
        };
        const renderSchoolsList = (searchTerm = '') => {
            const container = schoolsContainer;
            const filteredSchools = allSchools.filter(school => school.toLowerCase().includes(searchTerm.toLowerCase()));
            if (filteredSchools.length === 0) { container.innerHTML = `<p class="text-center text-gray-500 py-8">No schools found.</p>`; return; }
            container.innerHTML = ''; const list = document.createElement('div'); list.className = 'divide-y divide-gray-200';
            filteredSchools.forEach(school => { const item = document.createElement('a'); item.href = '#'; item.className = 'p-4 block hover:bg-gray-50'; item.innerHTML = `<p class="font-semibold text-gray-800">${school}</p>`; item.onclick = (e) => { e.preventDefault(); window.navigateToSchoolRoster(school); }; list.appendChild(item); });
            container.appendChild(list);
        };
        const renderAthletesList = (searchTerm = '') => {
            const container = athletesContainer;
            const filteredAthletes = allAthletes.filter(athlete => athlete.name.toLowerCase().includes(searchTerm.toLowerCase()));
            if (filteredAthletes.length === 0) { container.innerHTML = `<p class="text-center text-gray-500 py-8">No athletes found.</p>`; return; }
            container.innerHTML = ''; const list = document.createElement('div'); list.className = 'divide-y divide-gray-200';
            filteredAthletes.forEach(athlete => {
                const item = document.createElement('a'); item.href = '#'; item.className = 'p-4 flex justify-between items-center hover:bg-gray-50';
                item.onclick = (e) => { e.preventDefault(); window.navigateToAthletePage(athlete.id, 'athletes'); };
                const genderIcon = athlete.gender === 'G' ? '♀️' : athlete.gender === 'B' ? '♂️' : '👤';
                item.innerHTML = `<div><p class="font-semibold text-gray-800">${athlete.name} <span class="text-sm">${genderIcon}</span></p><p class="text-sm text-gray-500">${athlete.school} - Class of ${athlete.gradYear || 'N/A'}</p></div>`;
                list.appendChild(item);
            });
            container.appendChild(list);
        };
        const renderSchoolRoster = (schoolName) => {
            schoolRosterTitle.textContent = `${schoolName} Roster`;
            const container = schoolRosterContainer;
            const filteredAthletes = allAthletes.filter(a => a.school === schoolName);
            if (filteredAthletes.length === 0) {
                container.innerHTML = `<p class="text-center text-gray-500 py-8">No athletes for this school.</p>`;
                return;
            }
            let tableHTML = `<table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grad Year</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active Season</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
            filteredAthletes.forEach(athlete => {
                tableHTML += `<tr class="hover:bg-gray-50"><td class="px-6 py-4 whitespace-nowrap text-sm font-medium"><a href="#" onclick="window.navigateToAthletePage('${athlete.id}', 'schoolRoster')" class="text-red-600 hover:underline">${athlete.name}</a></td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${athlete.gender || 'U'}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${athlete.gradYear || 'N/A'}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${athlete.lastActiveSeason || 'N/A'}</td></tr>`;
            });
            tableHTML += `</tbody></table>`;
            container.innerHTML = tableHTML;
        };
        
        schoolSearchInput.addEventListener('input', (e) => renderSchoolsList(e.target.value));
        athleteSearchInput.addEventListener('input', (e) => renderAthletesList(e.target.value));
        const createMeetListElement = (meet) => {
            const item = document.createElement('div'); item.className = 'py-3 px-4 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50';
            const titleGroup = document.createElement('div');
            const titleLink = document.createElement('a'); titleLink.href = '#'; titleLink.className = 'text-lg font-bold text-red-600 hover:underline cursor-pointer'; titleLink.textContent = meet.name;
            titleLink.onclick = (e) => { e.preventDefault(); window.navigateToMeetPage(meet.id); };
            const date = document.createElement('p'); date.className = 'text-sm text-gray-500'; date.textContent = `${meet.venueName || ''} - ${formatDate(meet.date)}`;
            titleGroup.append(titleLink, date);
            const deleteButton = document.createElement('button'); deleteButton.className = 'text-red-500 hover:text-red-700 font-semibold px-3 py-1 rounded-lg hover:bg-red-100'; deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => {
                itemToDelete = { id: meet.id, type: 'meet' };
                deleteMessage.textContent = 'Are you sure you want to delete this meet and all its associated races and results? This action cannot be undone.';
                openModal(deleteModal, deleteModalBackdrop);
            };
            item.append(titleGroup, deleteButton); return item;
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


        // --- File Upload & Parsing ---
        const normalizeHeader = (header) => {
            const lower = (header || '').toLowerCase().trim();
            if (lower.includes('place')) return 'place';
            if (lower.includes('name') || lower.includes('athlete')) return 'name';
            if (lower.includes('grade')) return 'grade';
            if (lower.includes('school')) return 'school';
            if (lower.includes('time') || lower.includes('duration')) return 'time';
            if (lower.includes('gender')) return 'gender';
            return header;
        };
        const parseCSV = (text) => {
            const results = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                delimiter: ""
            });
            if (results.errors.length > 0) {
                console.error("Papa Parse Errors:", results.errors);
                throw new Error("CSV file could not be parsed. Check for formatting errors.");
            }
            return { headers: results.meta.fields, rows: results.data };
        };
        const objectsToCsv = (rows, headers) => {
            return Papa.unparse(rows, { columns: headers });
        };
        const handleCsvFile = (fileContent) => {
            try {
                const { headers, rows } = parseCSV(fileContent);
                const raceColumn = headers.find(h => {
                    const lowerHeader = h.toLowerCase().trim();
                    return lowerHeader.includes('race') || lowerHeader.includes('event') || lowerHeader.includes('division');
                });
                const genderColumn = headers.find(h => {
                    const lowerHeader = h.toLowerCase().trim();
                    return lowerHeader.includes('gender') || lowerHeader === 'sex';
                });

                let groupedRaces = {};
                if (raceColumn && genderColumn) {
                    groupedRaces = rows.reduce((acc, row) => {
                        const raceName = String(row[raceColumn] || 'Race').trim();
                        const gender = normalizeGender(row[genderColumn]);
                        const combinedKey = `${raceName} - ${gender}`;
                        if (!acc[combinedKey]) acc[combinedKey] = [];
                        acc[combinedKey].push(row);
                        return acc;
                    }, {});
                } else if (genderColumn) {
                    groupedRaces = rows.reduce((acc, row) => {
                        const gender = normalizeGender(row[genderColumn]);
                        let raceName = `${gender} Results`;
                        if (gender === 'B') raceName = 'Boys Results';
                        if (gender === 'G') raceName = 'Girls Results';
                        if (!acc[raceName]) acc[raceName] = [];
                        acc[raceName].push(row);
                        return acc;
                    }, {});
                }
                
                if (Object.keys(groupedRaces).length > 0) {
                    detectedRacesCache = Object.keys(groupedRaces).map(raceName => ({
                        name: raceName,
                        csvData: objectsToCsv(rows.filter(row => {
                            if (raceColumn && genderColumn) {
                                return `${String(row[raceColumn] || 'Race').trim()} - ${normalizeGender(row[genderColumn])}` === raceName;
                            } else if (genderColumn) {
                                const g = normalizeGender(row[genderColumn]);
                                const gName = g === 'B' ? 'Boys Results' : 'Girls Results';
                                return gName === raceName;
                            }
                            return true;
                        }), headers)
                    }));
                } else {
                    detectedRacesCache = [{ name: 'Full Results', csvData: fileContent }];
                }
                renderDetectedRaces();
                closeModal(uploadModal, uploadModalBackdrop);
                openModal(raceConfirmationModal, raceConfirmationModalBackdrop);
            } catch (error) {
                console.error("An error occurred in handleCsvFile:", error);
                alert("A critical error occurred while parsing the CSV. Check the console for details.");
            }
        };
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
             if (!uploadForm.checkValidity()) { alert("Please fill out Meet Name, Date, and Venue / Location first."); event.target.value = ''; return; }
            currentEventName = document.getElementById('meetName').value;
            currentEventDate = document.getElementById('meetDate').value;
            const file = event.target.files[0]; if (!file) return;
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
        async function analyzeResultsWithAI(text) {
             const apiKey = "AIzaSyCbzV-L_jXbP30PcQMDJhSs8Zfa2v_Icg4";
             const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
             const systemPrompt = `You are an expert sports data analyst for high school cross country. Analyze raw text from a race results PDF. Your task is to identify all distinct races (e.g., 'Varsity Boys', 'JV Girls') and extract their results into a structured JSON array. RULES: 1. Your entire output MUST be a single JSON array. 2. Each object in the array represents one race and must have "name" (string) and "csvData" (string). 3. "csvData" must be a string in CSV format, starting with a header row. 4. Required headers are 'Place', 'Name', 'Grade', 'School', 'Time'. Also include 'Gender' if it can be reliably determined (M/F). 5. If a race name is unclear, use a generic name like "Race 1". 6. Ensure the JSON is valid. Example: [{"name": "Varsity Boys", "csvData": "Place,Name,Grade,School,Time,Gender\\n1,John Smith,12,Northwood,15:45.2,M"}]`;
             const payload = { contents: [{ parts: [{ text }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } };
            try {
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) {
                    let errorMsg = `AI API error! Status: ${response.status}`;
                    const errorBody = await response.json();
                    errorMsg += ` Message: ${errorBody.error?.message || 'Unknown error'}`;
                    throw new Error(errorMsg);
                }
                const result = await response.json();
                const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!jsonText) throw new Error("AI returned an empty response.");
                return JSON.parse(jsonText);
            } catch(error) {
                console.error("AI Analysis Error:", error);
                alert("The AI could not understand the document. " + error.message);
                return [];
            }
        }
        
        // --- Race Confirmation & Import ---
        const renderDetectedRaces = () => {
            detectedRacesContainer.innerHTML = '';
           const filteredCourses = allCourses; // Simply use all available courses
            if (detectedRacesCache.length === 0) {
                detectedRacesContainer.innerHTML = `<p class="text-center text-gray-500">No races were detected.</p>`;
                return;
            }
            detectedRacesCache.forEach((race, index) => {
                const el = document.createElement('div');
                el.className = 'p-4 bg-white rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4 items-center';
                el.dataset.raceIndex = index;
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.value = race.name;
                nameInput.className = 'md:col-span-1 p-2 border rounded-md';
                const courseSelect = document.createElement('select');
                courseSelect.className = 'md:col-span-1 p-2 border rounded-md';
                courseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
                filteredCourses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.name} (${course.distanceInMeters}m)`;
                    courseSelect.appendChild(option);
                });
                const toggleContainer = document.createElement('div');
                toggleContainer.className = 'md:col-span-1 flex items-center justify-center';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = true;
                checkbox.className = 'h-5 w-5 rounded text-red-600 focus:ring-red-500';
                const label = document.createElement('label');
                label.textContent = ' Import';
                label.className = 'ml-2 text-sm font-medium text-gray-700';
                toggleContainer.append(checkbox, label);
                el.append(nameInput, courseSelect, toggleContainer);
                detectedRacesContainer.appendChild(el);
            });
        };
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
                    if (!raceName || !courseId) hasError = true;
                    racesToImport.push({ name: raceName, date: `${meetDate}T00:00:00`, data: detectedRacesCache[parseInt(el.dataset.raceIndex, 10)].csvData, courseId });
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
               const venueName = document.getElementById('meetVenue').value;
batch.set(meetDocRef, { id: meetDocRef.id, name: meetName, date: `${meetDate}T00:00:00`, venueName: venueName, createdAt: new Date().toISOString() }); 
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

        // --- Race & Result Upload Logic ---
        const calculateXcTime = (rawTimeSeconds, courseDifficulty) => {
    if (rawTimeSeconds === null || isNaN(rawTimeSeconds) || courseDifficulty === null || isNaN(courseDifficulty) || courseDifficulty === 0) {
        return null;
    }
    return rawTimeSeconds / courseDifficulty;
};
        const getGraduationYear = (raceDate, grade) => { const year = new Date(raceDate).getUTCFullYear(); const num = parseInt(grade, 10); return (isNaN(num) || num < 9 || num > 12) ? null : year + (12 - num) + 1; };

const findOrCreateAthlete = (name, school, grade, gender, raceDate, batch, existingAthletes) => {
    const raceYear = new Date(raceDate).getUTCFullYear();
    
    let athlete = existingAthletes.find(a => a.name === name && a.school === school);

    if (athlete) {
        let updates = {};
        if (!athlete.lastActiveSeason || raceYear > athlete.lastActiveSeason) {
            updates.lastActiveSeason = raceYear;
            athlete.lastActiveSeason = raceYear;
        }
        if ((!athlete.gender || athlete.gender === 'U') && gender !== 'U') {
            updates.gender = gender;
            athlete.gender = gender;
        }
        if (Object.keys(updates).length > 0) {
            batch.update(doc(db, ATHLETES_COLLECTION, athlete.id), updates);
        }
        return athlete;
    } else {
        const newAthleteData = { 
            name, 
            school, 
            gradYear: getGraduationYear(raceDate, grade), 
            gender: gender || 'U', 
            createdAt: new Date().toISOString(), 
            lastActiveSeason: raceYear 
        };
        const newAthleteRef = doc(collection(db, ATHLETES_COLLECTION));
        batch.set(newAthleteRef, newAthleteData);
        
        const newAthleteWithId = { id: newAthleteRef.id, ...newAthleteData };
        existingAthletes.push(newAthleteWithId);
        return newAthleteWithId;
    } // <-- This is the missing closing brace
};

        const processAndAddRace = (meetId, meetName, raceName, date, data, courseId, batch, existingAthletes) => {
            const selectedCourse = allCourses.find(c => c.id === courseId);
            if (!selectedCourse) throw new Error(`Invalid course for race: ${raceName}.`);
            
            const { headers, rows } = parseCSV(data);
            if (rows.length === 0) return;
            
            const keyMap = {};
            headers.forEach(h => { keyMap[normalizeHeader(h)] = h; });

            if (!keyMap.name || !keyMap.school || !keyMap.grade || !keyMap.time) {
                throw new Error(`CSV for "${raceName}" is missing required columns (like Athlete/Name, School, Grade, or Duration/Time).`);
            }
            
            const raceDocRef = doc(collection(db, RACES_COLLECTION));
            for (const row of rows) {
                const athleteName = row[keyMap.name]; 
                const athleteSchool = row[keyMap.school]; 
                const athleteGrade = row[keyMap.grade];
                const timeValue = row[keyMap.time];
                
                let genderValue = normalizeGender(row[keyMap.gender]);
                if (genderValue === 'U') {
                    genderValue = normalizeGender(raceName);
                }

                if (!athleteName || !athleteSchool || !athleteGrade) continue;
                
                const athlete = findOrCreateAthlete(athleteName, athleteSchool, athleteGrade, genderValue, date, batch, existingAthletes);
                
                const timeInSeconds = parseTimeToSeconds(timeValue);
                let xcTime = calculateXcTime(timeInSeconds, selectedCourse.difficulty);

                if (xcTime === Infinity) {
                    xcTime = null;
                }
                
                const resultDoc = { 
                    raceId: raceDocRef.id, meetId, raceName, meetName, raceDate: date, athleteId: athlete.id, 
                    school: athlete.school, 
                    gender: athlete.gender,
                    gradYear: athlete.gradYear, 
                    xcTime: xcTime,
                    courseId: selectedCourse.id,
                    ...selectedCourse,
                    place: row[keyMap.place] || null,
                    time: timeValue || null,
                    grade: row[keyMap.grade] || null
                };
                delete resultDoc.id;
                
                
                batch.set(doc(collection(db, RESULTS_COLLECTION)), resultDoc);
            }
            const newRaceData = { name: raceName, meetId, date, headers, createdAt: new Date().toISOString(), courseId: selectedCourse.id, courseName: selectedCourse.name, distanceInMeters: selectedCourse.distanceInMeters, difficulty: selectedCourse.difficulty };
            batch.set(raceDocRef, newRaceData);
        };

        // --- Top 50 Logic ---
        const renderTop50View = (schoolName) => {
            currentSchoolForRoster = schoolName;
            top50Title.textContent = `Top 50 XC Times - ${schoolName}`;
            top50CourseSelect.innerHTML = '<option value="All">All Courses</option>';
            allCourses.forEach(c => top50CourseSelect.add(new Option(`${c.name} (${c.distanceInMeters}m)`, c.id)));
            [top50CourseSelect, top50GenderSelect, top50GradeSelect].forEach(el => el.addEventListener('change', () => calculateAndRenderTop50(schoolName)));
            calculateAndRenderTop50(schoolName);
        };
        const calculateAndRenderTop50 = async (schoolName) => {
            top50Container.innerHTML = `<div class="page-loading-spinner"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div></div>`;
            const courseId = top50CourseSelect.value;
            const gender = top50GenderSelect.value;
            const grade = top50GradeSelect.value;
            let conditions = [where("school", "==", schoolName)];
            if (courseId !== 'All') conditions.push(where("courseId", "==", courseId));
            if (gender !== 'All') conditions.push(where("gender", "==", gender));
            if (grade !== 'All') {
                 const currentYear = new Date().getFullYear();
                 const gradYear = currentYear + (12 - parseInt(grade));
                 conditions.push(where("gradYear", "==", gradYear));
            }
            
            const q = query(collection(db, RESULTS_COLLECTION), ...conditions);
            try {
                const snapshot = await getDocs(q);
                const results = snapshot.docs.map(d => d.data());
                
                const athleteStats = new Map();
                for (const result of results) {
                    const xcTime = result.xcTime;
                    if (xcTime === null || xcTime === undefined) continue;
                    
                    if (!athleteStats.has(result.athleteId)) {
                        const athlete = allAthletes.find(a => a.id === result.athleteId);
                        athleteStats.set(result.athleteId, {
                            id: athlete ? athlete.id : null,
                            name: athlete ? athlete.name : 'Unknown',
                            gradYear: athlete ? athlete.gradYear : 'N/A',
                            gender: athlete ? athlete.gender : 'U',
                            times: [],
                            bestTimeRecord: null
                        });
                    }
                    
                    const stats = athleteStats.get(result.athleteId);
                    stats.times.push(xcTime);

                    if (stats.bestTimeRecord === null || xcTime < stats.bestTimeRecord.xcTime) {
                        stats.bestTimeRecord = result;
                    }
                }

                const rankedAthletes = [...athleteStats.values()].map(stats => {
                    const sum = stats.times.reduce((a, b) => a + b, 0);
                    return {
                        ...stats,
                        bestTime: stats.bestTimeRecord ? stats.bestTimeRecord.xcTime : Infinity,
                        averageTime: sum / stats.times.length,
                    };
                }).sort((a, b) => a.bestTime - b.bestTime).slice(0, 50);

                if (rankedAthletes.length === 0) {
                    top50Container.innerHTML = `<p class="text-center text-gray-500 py-8">No matching results found.</p>`;
                    return;
                }
                
                let tableHTML = `
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Athlete</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Time</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grad Year</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                `;
                
                rankedAthletes.forEach((a, i) => {
                    tableHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${i + 1}</td>
                            <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                <a href="#" onclick="window.navigateToAthletePage('${a.id}', 'top50')" class="text-red-600 hover:underline">${a.name}</a>
                            </td>
                            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${a.gender}</td>
                            <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">${formatSecondsToTime(a.bestTime)}</td>
                            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${formatSecondsToTime(a.averageTime)}</td>
                            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${a.gradYear}</td>
                            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${formatShortDate(a.bestTimeRecord.raceDate)}</td>
                            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${a.bestTimeRecord.name}</td>
                        </tr>
                    `;
                });
                
                tableHTML += `</tbody></table>`;
                top50Container.innerHTML = tableHTML;

            } catch(e) {
                console.error("Error getting Top 50:", e);
                top50Container.innerHTML = `<p class="text-center text-red-500 py-8">Error loading data.</p>`;
            }
        };

        // --- Delete Logic ---
        const deleteMeet = async (meetId) => {
            const batch = writeBatch(db);
            const racesQuery = query(collection(db, RACES_COLLECTION), where("meetId", "==", meetId));
            const racesSnapshot = await getDocs(racesQuery);
            const raceIds = [];
            racesSnapshot.forEach(doc => {
                raceIds.push(doc.id);
                batch.delete(doc.ref);
            });
            for (const raceId of raceIds) {
                const resultsQuery = query(collection(db, RESULTS_COLLECTION), where("raceId", "==", raceId));
                const resultsSnapshot = await getDocs(resultsQuery);
                resultsSnapshot.forEach(doc => batch.delete(doc.ref));
            }
            batch.delete(doc(db, MEETS_COLLECTION, meetId));
            await batch.commit();
        };

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
        
        // --- School Rankings Logic ---
        const navigateToSchoolRankings = async (schoolName) => {
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
            const selectedSeason = parseInt(rankingsSeasonSelect.value, 10);
            const selectedGender = rankingsGenderSelect.value;
            const selectedGrade = rankingsGradeSelect.value;
            const selectedMetric = rankingsMetricSelect.value;

            const filteredResults = seasonRankingsCache.filter(r => {
                const raceDate = new Date(r.raceDate);
                const season = raceDate.getUTCFullYear();
                const gradeForSeason = r.gradYear ? 12 - (r.gradYear - (raceDate.getUTCMonth() > 6 ? season + 1 : season)) : null;
                
                const seasonMatch = season === selectedSeason;
                const genderMatch = selectedGender === 'All' || r.gender === selectedGender;
                const gradeMatch = selectedGrade === 'All' || (gradeForSeason && gradeForSeason.toString() === selectedGrade);
                
                return seasonMatch && genderMatch && gradeMatch && r.xcTime !== null;
            });

            const athleteStats = new Map();
            filteredResults.forEach(r => {
                if (!athleteStats.has(r.athleteId)) {
                    const athlete = allAthletes.find(a => a.id === r.athleteId);
                    athleteStats.set(r.athleteId, {
                        id: r.athleteId,
                        name: athlete ? athlete.name : 'Unknown Athlete',
                        gradYear: athlete ? athlete.gradYear : 'N/A',
                        gender: athlete ? athlete.gender : 'U',
                        times: [],
                    });
                }
                athleteStats.get(r.athleteId).times.push(r.xcTime);
            });

            const rankedAthletes = [...athleteStats.values()].map(stats => {
                const sum = stats.times.reduce((a, b) => a + b, 0);
                return {
                    ...stats,
                    raceCount: stats.times.length,
                    best: Math.min(...stats.times),
                    average: sum / stats.times.length
                };
            });

            rankedAthletes.sort((a, b) => a[selectedMetric] - b[selectedMetric]);

            schoolRankingsContainer.innerHTML = '';
            if (rankedAthletes.length === 0) {
                schoolRankingsContainer.innerHTML = `<p class="text-center text-gray-500 py-8">No matching results found for the selected filters.</p>`;
                return;
            }
            
            const teamTimeContainer = document.getElementById('teamTimeContainer');
            const top5Athletes = rankedAthletes.sort((a, b) => a.best - b.best).slice(0, 5);
            if (top5Athletes.length === 5) {
                const teamTime = top5Athletes.reduce((sum, athlete) => sum + athlete.best, 0);
                teamTimeContainer.innerHTML = `
                    <h3 class="text-lg font-semibold text-gray-700">Season Best Team Time</h3>
                    <p class="text-3xl font-bold text-red-600">${formatSecondsToTime(teamTime)}</p>
                `;
            } else {
                teamTimeContainer.innerHTML = `
                    <h3 class="text-lg font-semibold text-gray-700">Season Best Team Time</h3>
                    <p class="text-md text-gray-500">Not enough data (requires 5 runners with times)</p>
                `;
            }

            const table = document.createElement('table');
            table.className = 'min-w-full divide-y divide-gray-200';
            table.innerHTML = `<thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Athlete</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Time</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Time</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Races</th></tr></thead><tbody class="bg-white divide-y divide-gray-200"></tbody>`;

            const tbody = table.querySelector('tbody');
            rankedAthletes.forEach((athlete, i) => {
                const row = tbody.insertRow();
                const isBest = selectedMetric === 'best' ? 'font-bold text-red-600' : '';
                const isAverage = selectedMetric === 'average' ? 'font-bold text-red-600' : '';
                row.innerHTML = `<td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${i + 1}</td><td class="px-4 py-4 whitespace-nowrap text-sm text-gray-800"><div><a href="#" onclick="window.navigateToAthletePage('${athlete.id}', 'schoolRankings')" class="hover:underline">${athlete.name}</a> (${athlete.gender})</div><div class="text-xs text-gray-500">Class of ${athlete.gradYear}</div></td><td class="px-4 py-4 whitespace-nowrap text-sm ${isBest}">${formatSecondsToTime(athlete.best)}</td><td class="px-4 py-4 whitespace-nowrap text-sm ${isAverage}">${formatSecondsToTime(athlete.average)}</td><td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${athlete.raceCount}</td>`;
            });
            schoolRankingsContainer.appendChild(table);
        };
        
        // --- Team Rankings Logic ---
        const navigateToTeamRankings = async () => {
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
            const selectedSeason = parseInt(teamRankingsSeasonSelect.value, 10);
            const selectedGender = teamRankingsGenderSelect.value;
            const selectedCourseId = teamRankingsCourseSelect.value;

            const filteredResults = teamRankingsCache.filter(r => {
                const season = new Date(r.raceDate).getUTCFullYear();
                const seasonMatch = season === selectedSeason;
                const genderMatch = r.gender === selectedGender;
                const courseMatch = selectedCourseId === 'All' || r.courseId === selectedCourseId;
                return seasonMatch && genderMatch && courseMatch && r.xcTime !== null;
            });

            const athleteBests = new Map();
            filteredResults.forEach(r => {
                if (!athleteBests.has(r.athleteId) || r.xcTime < athleteBests.get(r.athleteId).xcTime) {
                    athleteBests.set(r.athleteId, r);
                }
            });

            const schoolGroups = new Map();
            [...athleteBests.values()].forEach(bestResult => {
                if (!schoolGroups.has(bestResult.school)) {
                    schoolGroups.set(bestResult.school, []);
                }
                schoolGroups.get(bestResult.school).push(bestResult);
            });

            const rankedTeams = [];
            schoolGroups.forEach((athleteResults, schoolName) => {
                if (athleteResults.length >= 5) {
                    const top5Times = athleteResults.sort((a, b) => a.xcTime - b.xcTime).slice(0, 5);
                    const teamTime = top5Times.reduce((sum, r) => sum + r.xcTime, 0);
                    rankedTeams.push({
                        school: schoolName,
                        teamTime: teamTime,
                        top5Runners: top5Times.map(r => allAthletes.find(a => a.id === r.athleteId)?.name || 'Unknown')
                    });
                }
            });

            rankedTeams.sort((a, b) => a.teamTime - b.teamTime);

            teamRankingsContainer.innerHTML = '';
            if (rankedTeams.length === 0) {
                teamRankingsContainer.innerHTML = `<p class="text-center text-gray-500 py-8">No teams found with at least 5 runners for the selected filters.</p>`;
                return;
            }

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Time</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Top 5 Runners</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            rankedTeams.forEach((team, i) => {
                tableHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${i + 1}</td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <a href="#" onclick="window.navigateToSchoolRoster('${team.school}')" class="text-red-600 hover:underline">${team.school}</a>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">${formatSecondsToTime(team.teamTime)}</td>
                        <td class="px-4 py-4 whitespace-nowrap text-xs text-gray-500">${team.top5Runners.join(', ')}</td>
                    </tr>
                `;
            });
            
            tableHTML += `</tbody></table>`;
            teamRankingsContainer.innerHTML = tableHTML;
        };

        document.addEventListener('DOMContentLoaded', () => {
            // Event listeners
            document.body.addEventListener('click', (e) => {
                if (e.target.id === 'seasonRankingsBtn') {
                    navigateToSchoolRankings(currentSchoolForRoster);
                }
            });
            backToRosterFromRankingsBtn.addEventListener('click', () => navigateToSchoolRoster(currentSchoolForRoster));
            [rankingsSeasonSelect, rankingsGenderSelect, rankingsGradeSelect, rankingsMetricSelect].forEach(el => {
                el.addEventListener('change', calculateAndRenderSchoolRankings);
            });
            allNavLinks.teams.addEventListener('click', (e) => { e.preventDefault(); navigateToTeamRankings(); });
            [teamRankingsSeasonSelect, teamRankingsGenderSelect, teamRankingsCourseSelect].forEach(el => {
                el.addEventListener('change', calculateAndRenderTeamRankings);
            });
        });
        
        // Start the application
        initializeFirebase();

        // --- All Event Listeners Go Here ---
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    homeNav.addEventListener('click', (e) => { e.preventDefault(); showView('meets'); });
    allNavLinks.meets.addEventListener('click', (e) => { e.preventDefault(); showView('meets'); });
    allNavLinks.schools.addEventListener('click', (e) => { e.preventDefault(); showView('schools'); });
    allNavLinks.athletes.addEventListener('click', (e) => { e.preventDefault(); showView('athletes'); });
    allNavLinks.teams.addEventListener('click', (e) => { e.preventDefault(); navigateToTeamRankings(); });

    // Back Buttons
    backToMeetsBtn.addEventListener('click', () => showView('meets'));
    backToMeetBtn.addEventListener('click', () => {
        if (currentMeetCache.id) window.navigateToMeetPage(currentMeetCache.id);
        else showView('meets');
    });
    backToSchoolsBtn.addEventListener('click', () => showView('schools'));
    backToRosterBtn.addEventListener('click', () => showView('schoolRoster'));
    backToSourceBtn.addEventListener('click', () => { /* ... your existing code ... */ });
    backToRosterFromRankingsBtn.addEventListener('click', () => navigateToSchoolRoster(currentSchoolForRoster));

    // Modal Triggers
    uploadMeetBtn.addEventListener('click', () => openModal(uploadModal, uploadModalBackdrop));
    manageCoursesBtn.addEventListener('click', () => openModal(coursesModal, coursesModalBackdrop));
    
    // Modal Close Buttons
    [cancelUpload, cancelDelete, cancelRaceConfirmation, closeCoursesModal].forEach(btn => {
        if(btn) btn.addEventListener('click', () => closeModal(btn.closest('.modal'), btn.closest('.modal').previousElementSibling));
    });
    [uploadModalBackdrop, coursesModalBackdrop, deleteModalBackdrop, raceConfirmationModalBackdrop, predictionModalBackdrop].forEach(b => {
        if(b) b.addEventListener('click', () => closeModal(b.nextElementSibling, b));
    });

    // Forms and Inputs
    schoolSearchInput.addEventListener('input', (e) => renderSchoolsList(e.target.value));
    athleteSearchInput.addEventListener('input', (e) => renderAthletesList(e.target.value));
    courseForm.addEventListener('submit', async (e) => { /* ... your existing code ... */ });
    importSelectedRacesBtn.addEventListener('click', async () => { /* ... your existing code ... */ });
    csvUploadInput.addEventListener('change', (event) => { /* ... your existing code ... */ });
    pdfUploadInput.addEventListener('change', async (event) => { /* ... your existing code ... */ });
    confirmDelete.addEventListener('click', async () => { /* ... your existing code ... */ });

    // Other UI Buttons
    top50Btn.addEventListener('click', () => window.navigateToTop50(currentSchoolForRoster));
    predictRaceBtn.addEventListener('click', () => { /* ... your existing code ... */ });
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'seasonRankingsBtn') {
            navigateToSchoolRankings(currentSchoolForRoster);
        }
    });

    // Filter Dropdowns
    [top50CourseSelect, top50GenderSelect, top50GradeSelect].forEach(el => el.addEventListener('change', () => calculateAndRenderTop50(currentSchoolForRoster)));
    [rankingsSeasonSelect, rankingsGenderSelect, rankingsGradeSelect, rankingsMetricSelect].forEach(el => el.addEventListener('change', calculateAndRenderSchoolRankings));
    [teamRankingsSeasonSelect, teamRankingsGenderSelect, teamRankingsCourseSelect].forEach(el => el.addEventListener('change', calculateAndRenderTeamRankings));
    predictCourseSelect.addEventListener('change', async (event) => { /* ... your existing code ... */ });
});


// Start the application
initializeFirebase();



        // --- Logic for the "Load More Athletes" button ---

// This function adds new athletes to the list instead of replacing them
function appendAthletesToList(newAthletes) {
    if (!athletesContainer) return;
    // We can reuse the rendering logic from your renderAthletesList function
    // For now, let's just create simple elements
    newAthletes.forEach(athlete => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'p-4 flex justify-between items-center hover:bg-gray-50 border-t';
        item.onclick = (e) => { e.preventDefault(); window.navigateToAthletePage(athlete.id, 'athletes'); };
        const genderIcon = athlete.gender === 'G' ? '♀️' : athlete.gender === 'B' ? '♂️' : '👤';
        item.innerHTML = `<div><p class="font-semibold text-gray-800">${athlete.name} <span class="text-sm">${genderIcon}</span></p><p class="text-sm text-gray-500">${athlete.school} - Class of ${athlete.gradYear || 'N/A'}</p></div>`;
        athletesContainer.querySelector('.divide-y').appendChild(item); // Appends to the list
    });
}

function setupLoadMoreAthletes() {
    const loadMoreAthletesBtn = document.getElementById('loadMoreAthletesBtn');
    if (!loadMoreAthletesBtn) return;

    loadMoreAthletesBtn.addEventListener('click', async () => {
        if (!lastVisibleAthlete) {
            loadMoreAthletesBtn.style.display = 'none';
            return;
        }

        loadMoreAthletesBtn.textContent = 'Loading...';
        loadMoreAthletesBtn.disabled = true;

        try {
            const q = query(collection(db, ATHLETES_COLLECTION),
                orderBy("name", "asc"),
                startAfter(lastVisibleAthlete),
                limit(ITEMS_PER_PAGE)
            );
            
            const documentSnapshots = await getDocs(q);
            lastVisibleAthlete = documentSnapshots.docs[documentSnapshots.docs.length - 1];

            const newAthletes = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allAthletes.push(...newAthletes);
            appendAthletesToList(newAthletes);

            if (documentSnapshots.empty) {
                loadMoreAthletesBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading more athletes:', error);
        } finally {
            loadMoreAthletesBtn.textContent = 'Load More';
            loadMoreAthletesBtn.disabled = false;
        }
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase()
        .then(() => {
            setupLoadMoreAthletes();
        })
        .catch(error => {
            console.error('Failed to initialize:', error);
        });
});
