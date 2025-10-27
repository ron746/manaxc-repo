// =================================================================
// PART 1: IMPORTS, CONFIG, AND GLOBAL VARIABLES
// This code runs first and does not touch the HTML document.
// =================================================================

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, getDoc, writeBatch, query, where, getDocs, limit, updateDoc, orderBy, startAfter } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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
    // (Add any other of your specific DOM element consts here if they are missing)

    // Make navigation functions globally accessible
    window.navigateToMeetPage = (meetId) => { renderMeetPage(meetId); showView('meetPage'); };
    window.navigateToResults = (raceId) => { renderSingleRaceView(raceId); showView('results'); };
    window.navigateToSchoolRoster = (schoolName) => { currentSchoolForRoster = schoolName; renderSchoolRoster(schoolName); showView('schoolRoster'); };
    window.navigateToAthletePage = (athleteId, sourceView) => {
        currentAthleteViewSource.view = sourceView;
        currentAthleteIdForPrediction = athleteId;
        if (sourceView === 'top50') currentAthleteViewSource.context = currentSchoolForRoster;
        renderAthleteResults(athleteId);
    };
    window.navigateToTop50 = (schoolName) => { renderTop50View(schoolName); showView('top50'); };
    window.navigateToSchoolRankings = (schoolName) => { navigateToSchoolRankings(schoolName); };

    // --- Helper Functions that use DOM elements ---
    const showView = (viewName) => {
        Object.values(allViews).forEach(v => v.style.display = 'none');
        Object.values(allNavLinks).forEach(l => l.classList.remove('active'));
        if (allViews[viewName]) allViews[viewName].style.display = 'block';
        const navMap = { meets: 'meets', meetPage: 'meets', results: 'meets', schools: 'schools', schoolRoster: 'schools', top50: 'schools', athletes: 'athletes', athleteResults: 'athletes', schoolRankings: 'schools', teamRankings: 'teams' };
        const activeNav = navMap[viewName] || 'meets';
        if (allNavLinks[activeNav]) allNavLinks[activeNav].classList.add('active');
    };

    const openModal = (modal, backdrop) => { /* ... your function ... */ };
    const closeModal = (modal, backdrop) => { /* ... your function ... */ };

    // --- Data Fetching ---
    async function fetchAndRenderInitialMeets() { /* ... your function ... */ }
    async function fetchAndRenderInitialAthletes() { /* ... your function ... */ }
    async function fetchAndRenderAllSchools() { /* ... your function ... */ }

    // --- Rendering Functions ---
    const renderCoursesList = () => { /* ... your function ... */ };
    const renderDetectedRaces = () => { /* ... your function ... */ };
    const renderMeetsList = () => { /* ... your function ... */ };
    // (all your other rendering functions go here)


    // --- Logic and Event Listeners ---
    const calculateXcTime = (rawTimeSeconds, courseDifficulty) => { /* ... your function ... */ };
    const getGraduationYear = (raceDate, grade) => { /* ... your function ... */ };
    const findOrCreateAthlete = (name, school, grade, gender, raceDate, batch, existingAthletes) => { /* ... your function ... */ };
    const processAndAddRace = (meetId, meetName, raceName, date, data, courseId, batch, existingAthletes) => { /* ... your function ... */ };
    
    // (all other logic functions go here)

    // --- Event Listener Setup ---
    function setupAllEventListeners() {
        homeNav.addEventListener('click', (e) => { e.preventDefault(); showView('meets'); });
        uploadMeetBtn.addEventListener('click', () => openModal(uploadModal, uploadModalBackdrop));
        // ... (and ALL your other addEventListener calls) ...
    }


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
    setupAllEventListeners();
    initializeFirebase();
});