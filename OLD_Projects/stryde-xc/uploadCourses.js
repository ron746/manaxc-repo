const admin = require('firebase-admin');
const fs = require('fs');
const Papa = require('papaparse');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Set the path to your courses collection
const APP_ID = 'stryde-xc-live';
const COURSES_COLLECTION = `artifacts/${APP_ID}/public/data/courses`;
const coursesCollectionRef = db.collection(COURSES_COLLECTION);

// Main script function
async function uploadCourses() {
  const csvFile = fs.readFileSync('./courses.csv', 'utf8');

  Papa.parse(csvFile, {
    header: true,
    dynamicTyping: true, // Automatically converts numbers
    skipEmptyLines: true,
    complete: async (results) => {
      const courses = results.data;
      console.log(`Found ${courses.length} courses to upload.`);

      const batch = db.batch();

      for (const course of courses) {
        // Ensure all required fields exist before adding
        if (course.name && course.distanceInMeters && typeof course.difficulty !== 'undefined') {
          const docRef = coursesCollectionRef.doc(); // Create a new document with a random ID
          batch.set(docRef, {
              name: course.name,
              distanceInMeters: course.distanceInMeters,
              difficulty: course.difficulty,
              range: course.range || 0.02 // Default range to 2% if not in CSV
          });
        }
      }

      try {
        await batch.commit();
        console.log('✅ Successfully uploaded all courses!');
      } catch (error) {
        console.error('Error uploading courses:', error);
      }
    }
  });
}

uploadCourses();
