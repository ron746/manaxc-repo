// =================================================================
// PART 1: IMPORTS, CONFIG, AND GLOBAL STATE
// =================================================================

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
    const resultsTableContainerWrapper = document.getElementById('resultsTableContainerWrapper');
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


    // --- All Functions Go Here ---

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
    window.navigateToSchoolRankings = (schoolName) => navigateToSchoolRankings(schoolName);
    window.deleteCourse = async (courseId) => {
        if (confirm("Are you sure you want to delete this course?")) {
            try {
                await deleteDoc(doc(db, COURSES_COLLECTION, courseId));
            } catch (error) {
                console.error("Error deleting course: ", error);
                alert("Could not delete course.");
            }
        }
    };

    const formatDate = (dateString) => {if (!dateString) return 'N/A';const date = new Date(dateString); return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });};
    const formatShortDate = (dateString) => {   if (!dateString) return 'N/A';    const date = new Date(dateString);  const month = date.getUTCMonth() + 1;  const day = date.getUTCDate();    const year = date.getUTCFullYear().toString().slice(-2);    return `${month}/${day}/${year}`;};
    const formatSecondsToTime = (totalSeconds) => {    if (totalSeconds === Infinity || isNaN(totalSeconds) || totalSeconds === null) return 'N/A';    const minutes = Math.floor(totalSeconds / 60);    const seconds = (totalSeconds % 60).toFixed(2);    return `${minutes}:${seconds.toString().padStart(5, '0')}`;};
    const normalizeGender = (genderStr) => {  const lowerGender = (genderStr || '').toLowerCase().trim();    if (lowerGender.includes('boy') || lowerGender === 'm' || lowerGender === 'b') {  return 'B';   }  if (lowerGender.includes('girl') || lowerGender === 'f' || lowerGender === 'g') {   return 'G';    }  return 'U';};
    const parseTimeToSeconds = (timeStr) => {  if (!timeStr || typeof timeStr !== 'string') return null;    const parts = timeStr.split(':');    let seconds = 0;  if (parts.length === 2) { seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);    } else if (parts.length === 1) { seconds = parseFloat(parts[0]);    }    return isNaN(seconds) ? null : seconds;};

    async function fetchAndRenderInitialMeets() { /* ... function body ... */ }
    async function fetchAndRenderInitialAthletes() { /* ... function body ... */ }
    async function fetchAndRenderAllSchools() { /* ... function body ... */ }
    const renderMeetsList = () => { /* ... function body ... */ };
    const createMeetListElement = (meet) => { /* ... function body ... */ };
    const renderHomePageSidebar = () => { /* ... function body ... */ };
    const renderAthletesList = (searchTerm = '') => { /* ... function body ... */ };
    const renderSchoolsList = (searchTerm = '') => { /* ... function body ... */ };
    const renderMeetPage = (meetId) => { /* ... function body ... */ };
    const renderSingleRaceView = async (raceId) => { /* ... function body ... */ };
    function renderRaceResultsPage(race) { /* ... function body ... */ }
    const renderSchoolRoster = (schoolName) => { /* ... function body ... */ };
    const renderAthleteResults = async (athleteId) => { /* ... function body ... */ };
    function renderAthleteResultsTable() { /* ... function body ... */ }
    function renderAthleteChart(results) { /* ... function body ... */ }
    const renderTop50View = (schoolName) => { /* ... function body ... */ };
    const calculateAndRenderTop50 = async (schoolName) => { /* ... function body ... */ };
    const navigateToSchoolRankings = async (schoolName) => { /* ... function body ... */ };
    const calculateAndRenderSchoolRankings = () => { /* ... function body ... */ };
    const navigateToTeamRankings = async () => { /* ... function body ... */ };
    const calculateAndRenderTeamRankings = () => { /* ... function body ... */ };
    const handleCsvFile = (fileContent) => { /* ... function body ... */ };
    const analyzeResultsWithAI = async (text) => { /* ... function body ... */ };
    const renderDetectedRaces = () => { /* ... function body ... */ };
    const calculateXcTime = (rawTimeSeconds, courseDifficulty) => { /* ... function body ... */ };
    const getGraduationYear = (raceDate, grade) => { /* ... function body ... */ };
    const findOrCreateAthlete = (name, school, grade, gender, raceDate, batch, existingAthletes) => { /* ... function body ... */ };
    const processAndAddRace = (meetId, meetName, raceName, date, data, courseId, batch, existingAthletes) => { /* ... function body ... */ };
    const deleteMeet = async (meetId) => { /* ... function body ... */ };
    const showView = (viewName) => { /* ... function body ... */ };
    const openModal = (modal, backdrop) => { /* ... function body ... */ };
    const closeModal = (modal, backdrop) => { /* ... function body ... */ };
    const appendAthletesToList = (newAthletes) => { /* ... function body ... */ };
    const predictRaceRange = async (athleteId, targetCourseId) => { /* ... function body ... */ };
    const renderCoursesList = () => { /* ... function body ... */ };
    
    // --- Event Listeners ---
    homeNav.addEventListener('click', (e) => { e.preventDefault(); showView('meets'); });
    allNavLinks.meets.addEventListener('click', (e) => { e.preventDefault(); showView('meets'); });
    allNavLinks.schools.addEventListener('click', (e) => { e.preventDefault(); showView('schools'); });
    allNavLinks.athletes.addEventListener('click', (e) => { e.preventDefault(); showView('athletes'); });
    allNavLinks.teams.addEventListener('click', (e) => { e.preventDefault(); navigateToTeamRankings(); });
    backToMeetsBtn.addEventListener('click', () => showView('meets'));
    backToMeetBtn.addEventListener('click', () => {
        if (currentMeetCache.id) window.navigateToMeetPage(currentMeetCache.id);
        else showView('meets');
    });
    backToSchoolsBtn.addEventListener('click', () => showView('schools'));
    backToRosterBtn.addEventListener('click', () => showView('schoolRoster'));
    backToSourceBtn.addEventListener('click', () => {
        if(currentAthleteViewSource.view === 'top50'){
            window.navigateToTop50(currentAthleteViewSource.context);
        } else {
            showView(currentAthleteViewSource.view)
        }
    });
    backToRosterFromRankingsBtn.addEventListener('click', () => navigateToSchoolRoster(currentSchoolForRoster));
    uploadMeetBtn.addEventListener('click', () => openModal(uploadModal, uploadModalBackdrop));
    manageCoursesBtn.addEventListener('click', () => openModal(coursesModal, coursesModalBackdrop));
    [cancelUpload, cancelDelete, cancelRaceConfirmation, closeCoursesModal, closePredictionModal].forEach(btn => {
        if(btn) btn.addEventListener('click', () => closeModal(btn.closest('.modal'), btn.closest('.modal').previousElementSibling));
    });
    [uploadModalBackdrop, coursesModalBackdrop, deleteModalBackdrop, raceConfirmationModalBackdrop, predictionModalBackdrop].forEach(b => {
        if(b) b.addEventListener('click', () => closeModal(b.nextElementSibling, b));
    });
    schoolSearchInput.addEventListener('input', (e) => renderSchoolsList(e.target.value));
    athleteSearchInput.addEventListener('input', (e) => renderAthletesList(e.target.value));
    courseForm.addEventListener('submit', async (e) => { /* ... your function body ... */ });
    importSelectedRacesBtn.addEventListener('click', async () => { /* ... your function body ... */ });
    csvUploadInput.addEventListener('change', (event) => { /* ... your function body ... */ });
    pdfUploadInput.addEventListener('change', async (event) => { /* ... your function body ... */ });
    confirmDelete.addEventListener('click', async () => { /* ... your function body ... */ });
    top50Btn.addEventListener('click', () => window.navigateToTop50(currentSchoolForRoster));
    predictRaceBtn.addEventListener('click', () => { /* ... your function body ... */ });
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'seasonRankingsBtn') {
            navigateToSchoolRankings(currentSchoolForRoster);
        }
    });
    [top50CourseSelect, top50GenderSelect, top50GradeSelect].forEach(el => el.addEventListener('change', () => calculateAndRenderTop50(currentSchoolForRoster)));
    [rankingsSeasonSelect, rankingsGenderSelect, rankingsGradeSelect, rankingsMetricSelect].forEach(el => el.addEventListener('change', calculateAndRenderSchoolRankings));
    [teamRankingsSeasonSelect, teamRankingsGenderSelect, teamRankingsCourseSelect].forEach(el => el.addEventListener('change', calculateAndRenderTeamRankings));
    predictCourseSelect.addEventListener('change', async (event) => { /* ... your function body ... */ });

    // --- Initialization & Startup ---
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

    // --- Start App ---
    initializeFirebase();
});