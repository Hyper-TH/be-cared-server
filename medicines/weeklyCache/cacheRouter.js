import cron from 'node-cron';
import express from 'express';
import admin from 'firebase-admin';
import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestDocument } from '../methods.js';


const router = express.Router();

/* START BLOCK THAT RUNS EVERY FRIDAY */
// RUN EVERYDAY AT 12 PM
// const job = cron.schedule('0 12 * * *', myScheduledMethod, {
//     scheduled: true,
//     timezone: "Europe/London"
// });

// RUN EVERY HOUR
// const job = cron.schedule('0 * * * *', myScheduledMethod, {
//     scheduled: true,
//     timezone: "Europe/London"
// });

// RUN EVERY 30 MINS
// const job = cron.schedule('0,30 * * * *', myScheduledMethod, {
//     scheduled: true,
//     timezone: "Europe/London"
// });

// RUN EVERY 10 MINS
// const job = cron.schedule('*/10 * * * *', weeklyCache, {
//     scheduled: true,
//     timezone: "Europe/London"
// });

// RUN EVERY FRIDAY
// const job = cron.schedule('0 0 14 * * 5', myScheduledMethod, null, true, 'Europe/London');

// Start the job
// job.start();
/* END BLOCK THAT RUNS EVERY FRIDAY */

// Method to run every day/week
const weeklyCache = async () => {
    const collectionName = "files";

    try {
        // Fetch all documents in the collection (or adapt this query to your needs)
        const querySnapshot = await firestore.collection(collectionName).get();

        if (querySnapshot.empty) {
            console.log('No documents found.');
            return;
        }

        // Iterate over each document in the collection
        for (const doc of querySnapshot.docs) {
            const documentID = doc.id;
            console.log(`Processing document with ID: ${documentID}`);

            try {
                // Fetch the current document's data
                let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();
                let cachedDocument = documentSnapshot.data();

                let token = await requestToken(tokenOptions);
                let newDocument = await requestDocument(token, documentID);

                console.log("New Document:", newDocument);
                console.log("Old Document:", cachedDocument.doc);

                // Convert to Buffer if they're not already (this step may be unnecessary if they are already Buffers)
                const newDocumentBuffer = Buffer.from(newDocument);
                const cachedDocumentBuffer = Buffer.from(cachedDocument.doc);

                // Compare the two documents using Buffer.compare
                const isEqual = Buffer.compare(newDocumentBuffer, cachedDocumentBuffer) === 0;

                if (isEqual) {

                    console.log(`No new updates`);
                } else {
                    // TODO: Notification system
                    // If documents are not equal, update Firestore with the new document
                    const data = {
                        doc: newDocument
                    };

                    await firestore.collection(collectionName).doc(documentID).set(data);
                    console.log(`Document with ID: ${documentID} has been updated.`);
                }

            } catch (error) {
                console.error(`An error occurred while processing document ID: ${documentID}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error fetching documents: ${error}`);
    }
    
};  

const job = cron.schedule('0 12 * * *', myScheduledMethod, {
    scheduled: true,
    timezone: "Europe/London"
});
job.start();

export default router;