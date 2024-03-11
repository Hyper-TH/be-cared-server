import cron from 'node-cron';
import express from 'express';
import admin from 'firebase-admin';
import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestDocument } from '../methods.js';

const router = express.Router();

// Endpoint to cache medicine
router.get('/cacheMed', async (req, res) => {
    try {
        const { id, name, activeIngredient, company, status, pil, spc } = req.query;
        console.log("ID:", id);

        const pilPath = pil.replace(/ /g, "_");
        const spcPath = spc.replace(/ /g, "_");

        const documentID = id;
        const collectionName = "medicines";

        let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();

        if (!documentSnapshot.exists) {
            console.log(`Caching to server with new documentID: ${documentID}`);

            const data = {
                name: name,
                activeIngredient: activeIngredient,
                company: company,
                status: status,
                pilPath: pilPath,
                spcPath: spcPath
            };

            try {
                await firestore.collection(collectionName).doc(documentID).set(data);
                
                console.log("Cached to server!");
            } catch (error) {

                console.error("An error occurred at /cacheMed:", error);
            } 

        } else {
            console.log(`Medicine is already cached`);
        }

    } catch (error) {
        console.error("An error occured at /cacheMed:", error);
    }
});

// Endpoint to get cache document
router.get('/grabCache', async (req, res) => {
    const { uploadPath } = req.query;

    console.log(uploadPath);

    // Replace space with _ for firestore
    const documentID = uploadPath.replace(/ /g, "_");
    console.log(documentID);

    const collectionName = "files"; 
    
    try {
        let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();
        
        // If it's already in the server (cached)
        if (documentSnapshot.exists) {
            console.log(`Found cached document`);
            const documentData = documentSnapshot.data();
            
            res.type('application/pdf').send(documentData);
        } else {
            // If it does not, cache this to the server!
            console.log(`Caching to server with new documentID: ${documentID}`);

            const token = await requestToken(tokenOptions);
            const document = await requestDocument(token, uploadPath);
 
            const data = {
                doc: document
            }

            // Sample medicine: PIL for Panadol ActiFast 500mg Soluble Tablets
            try {
                await firestore.collection(collectionName).doc(documentID).set(data);
                
                console.log("Cached to server!");
              
                let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();
                const documentData = documentSnapshot.data();
              
                res.type('application/pdf').send(documentData);

            } catch (error) {
                console.error("An error occurred:", error);
                
                res.type('application/pdf').send(data);
            } 
        }

    } catch (error) {
      console.error(`Error fetching data: ${error}`);
    }
});


// Endpoint

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

                /*
                    TODO: 
                    Caching medicine
                    First grab the name of the medicine and execute a requestList() 
                    and take the first instance (i.e., response[0]) then take these:
                    name: medicine.name
                    id: medicine.id
                    pil: encodeURIComponent(medicine.pils[0].activePil.file.name),
                    spc: encodeURIComponent(medicine.activeSPC.file.name)
                    
                    This requires implementing a new collection called medicines and has this structure:
                    id: 1321 = {
                        name: name,
                        pil_path,
                        spc_path,

                    }

                    The collection users will also be changed:
                    user: test2@123.com = {
                        medicines : [
                            0: { 
                                activeIngredient,
                                company,
                                name,
                                pil_path, 
                                spc_path,
                                id
                            }
                        ],
                        type: "standard"
                    }
                    
                    The files collection remains the same.

                    PDFRenderPage will also change its logic. It will now pass the medicine.id 
                    and the corresponding paths. Once /grabCache receives the params, it will
                    look over the medicines collection and check if the passed ID exists.
                    If it is, then grab the value of the pil/spc path, if they're the same then
                    proceed to go to the files collection and grab that document based on the path
                    (i.e., the file is cached and updated)

                    If the ID passed is NOT in medicines collection, then that means that this hasn't
                    been cached at all. Proceed to cache everything INCLUDING the other unmentioned path.
                    
                    Otherwise if the paths are not the same, change the value of the path in the 
                    medicine collection, and then call requestDocument() passing that new path, 
                    and then push it to the files collection.

                    In terms of notification system, when getSubs() is called, all paths are crosschecked 
                    with the medicine using the medicine id, if it is not equal, then add a counter to
                    "notifications" otherwise ignore.

                */
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

// TODO: Move cache endpoints to here

// TODO: Vercel has a setup for cron jobs, establish that
const job = cron.schedule('0 12 * * *', weeklyCache, {
    scheduled: true,
    timezone: "Europe/London"
});
job.start();

export default router;