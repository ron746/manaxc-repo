const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

// Define the paths to your collections
const APP_ID = "stryde-xc-live";
const ATHLETES_COLLECTION = `artifacts/${APP_ID}/public/data/athletes`;
const RESULTS_COLLECTION = `artifacts/${APP_ID}/public/data/results`;

/**
 * A manually triggered Cloud Function to calculate and save an "averageXcTime"
 * rating for every athlete in the database.
 */
exports.calculateRunnerRatings = functions.https.onCall(async (data, context) => {
  const athletesSnapshot = await db.collection(ATHLETES_COLLECTION).get();
  const athletes = athletesSnapshot.docs;

  let updatedCount = 0;
  const batchSize = 400;
  let batch = db.batch();

  functions.logger.log(`Starting rating calculation for ${athletes.length} athletes.`);

  for (let i = 0; i < athletes.length; i++) {
    const athlete = athletes[i];
    const resultsSnapshot = await db.collection(RESULTS_COLLECTION)
        .where("athleteId", "==", athlete.id)
        .get();

    const validResults = resultsSnapshot.docs
        .map((doc) => doc.data().xcTime)
        .filter((time) => time !== null && !isNaN(time));

    if (validResults.length > 0) {
      const sum = validResults.reduce((a, b) => a + b, 0);
      const averageXcTime = sum / validResults.length;

      const athleteRef = db.collection(ATHLETES_COLLECTION).doc(athlete.id);
      batch.update(athleteRef, {
        averageXcTime: averageXcTime,
        raceCountForRating: validResults.length,
      });

      updatedCount++;

      if ((i + 1) % batchSize === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }

  await batch.commit();
  functions.logger.log(`Committed the final batch. Total athletes updated: ${updatedCount}`);

  return {
    status: "success",
    message: `Successfully calculated and saved ratings for ${updatedCount} athletes.`,
  };
});
