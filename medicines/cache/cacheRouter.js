import cron from 'node-cron';
import express from 'express';
import admin from 'firebase-admin';
import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestList, requestDocument } from '../methods.js';

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
            const document = await requestDocument(token, encodeURIComponent(uploadPath));
 
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

// Method to run every day/week
const weeklyCachePIL = async () => {
    const collectionName = "medicines";

    try {
        // Fetch all documents in the collection (or adapt this query to your needs)
        const querySnapshot = await firestore.collection(collectionName).get();

        if (querySnapshot.empty) {
            console.log('No documents found.');
            return;
        }

        // Iterate over each document in the collection
        // Use a for...of loop to handle async operations
        for (const doc of querySnapshot.docs) {
            const cachedPath = doc.data().pilPath;
            const medicineID = doc.id;
            const medicineName = doc.data().name;
            let newPath;

            console.log(`Processing document with medName: ${medicineName} id: ${medicineID}`);

            // console.log(`${doc.id} =>`, doc.data());

            try {

                // Get the first result of searchList
                let token = await requestToken(tokenOptions);
                const medsData = await requestList(token, medicineName);

                // Initialize x to 0 to start from the first index of medsData.entities
                let x = 0;
                let found = false; // Flag to indicate whether a match is found

                // Loop through medsData.entities until a match is found or the end of the array is reached
                while (x < medsData.entities.length && !found) {
                    if ((medsData.entities[x].id).toString() === medicineID) {
                        // If a match is found, log the matching entity and set found to true
                        console.log(`Match found:`);
                        console.log(`${medsData.entities[x].name} == ${medicineName}`)

                        found = true;
                    } else {
                        // If no match, increment x to check the next entity
                        console.log("Incremented X");

                        x = x + 1;
                    }
                }   // end while

                // Now compare the filepath if its the same as cached path
                if (medsData.entities[x].pils[0]) {
                    newPath = medsData.entities[x].pils[0].activePil.file.name;

                    // The cached path has replaced spaces with '%20'
                    // If new path is the same as currentPath
                    if (decodeURIComponent(cachedPath) === newPath) {
                        console.log(`${cachedPath} = ${newPath}`);

                        // Call requestDocument() with new path 
                        token = await requestToken(tokenOptions);
                        let newPILDoc = await requestDocument(token, encodeURIComponent(newPath));                        // Call requestDocument() with new path 

                        console.log(newPILDoc);

                        // Fetch the current document's data
                        let documentSnapshot = await firestore.collection("files").doc(cachedPath).get();
                        let cachedDocument = documentSnapshot.data();

                        if (cachedDocument) {
                            console.log("cacheDocument: ", cachedDocument.doc);

                            // Convert to Buffer if they're not already (this step may be unnecessary if they are already Buffers)
                            const newDocumentBuffer = Buffer.from(newPILDoc);
                            const cachedDocumentBuffer = Buffer.from(cachedDocument.doc);
    
                            // Compare the two documents using Buffer.compare
                            const isEqual = Buffer.compare(newDocumentBuffer, cachedDocumentBuffer) === 0;
    
                            if (isEqual) {
    
                                console.log(`No new updates`);
                            } 
    
                            // If it's not equal, replace the cachedPath with the new document
                            else {
                                console.log("Cached Doc != New Doc");
                                try {
                                    const data = {
                                        doc: newPILDoc
                                    }
    
                                    // Update file collection
                                    await firestore.collection("files").doc(newPath).delete();
                                    await firestore.collection("files").doc(newPath).set(data)
            
                                    
                                    console.log("Cached to server!");
                                } catch (error) {
                                    console.error("An error occurred:", error);
                                } 
                            }
    
                        }  
                        // If the path isn't cached yet (i.e., path does not exist in files collection)
                        else {
                            try {
                                const data = {
                                    doc: newPILDoc
                                }

                                // Update file collection
                                await firestore.collection("files").doc(newPath).delete();
                                await firestore.collection("files").doc(newPath).set(data)
        
                                console.log("Cached to server!");
                            } catch (error) {
                                console.log(`Could not cache due to exceeding limits!`);

                                console.error("An error occurred:", error);
                            } 
                        }                     

                    } 
                    // If new path is different
                    else {
                        console.log(`${cachedPath} != ${newPath}`);

                        console.log(`Removing ${cachedPath}`);

                        // Remove cachedPath in the files collection
                        await firestore.collection("files").doc(cachedPath).delete();

                        // Update the pilPath in the medicines collection
                        await firestore.collection("medicines").doc(medicineID).update({
                            [pilPath]: newPath
                        });

                        // Set new instance in the files collection with the newPath
                        token = await requestToken(tokenOptions);
                        newPILDoc = await requestDocument(token, encodeURIComponent(newPath)); 
                        
                        const data = {
                            doc: newPILDoc
                        }
            
                        try {
                            await firestore.collection("files").doc(newPath).set(data);
                            
                            console.log("Cached to server!");
                        } catch (error) {
                            console.log(`Could not cache due to exceeding limits!`);

                            console.error("An error occurred:", error);
                        } 
                    }

                } else {
                    console.log(`No new PIL for  ${medicineID} : ${medicineName} `);
                }

                
                // If no match is found after looping through all entities
                if (!found) {
                    console.log(`No match found for medicine ID: ${medicineID}`);
                }

                
            } catch (error) {
                console.error(`An error occurred while processing medicine ID: ${medicineID}:`, error);
            }
        };

    } catch (error) {
        console.error(`Error fetching documents: ${error}`);
    }
    
};  

    /*TODO: Implement this
        function estimateFirestoreDocumentSize(object) {
            const jsonString = JSON.stringify(object);
            // Assuming the environment uses UTF-16 encoding (JavaScript's default string encoding)
            return new Blob([jsonString]).size;
        }

        const docSize = estimateFirestoreDocumentSize(yourDocumentObject);
        console.log(`Estimated document size: ${docSize} bytes`);

        // Check if the document is within Firestore's size limits
        if (docSize > 1048487) {
            console.log('The document is too large to store in Firestore.');
            // Handle the error, maybe split the data or compress it
        } else {
            // Safe to write the document to Firestore
            firestore.collection(collectionName).doc(documentID).set(yourDocumentObject);
        }
    */
// TODO: Vercel has a setup for cron jobs, establish that
const job = cron.schedule('*/2 * * * *', weeklyCachePIL, {
    scheduled: true,
    timezone: "Europe/London"
});
job.start();

export default router;