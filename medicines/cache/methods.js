import cron from 'node-cron';
import admin from 'firebase-admin';
import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestList, requestDocument } from '../methods.js';

function estimateFirestoreDocumentSize(object) {
    const jsonString = JSON.stringify(object);

    // Assuming the environment uses UTF-16 encoding (JavaScript's default string encoding)
    return new Blob([jsonString]).size;
}

// Method to run every day/week
const weeklyCachePIL = async () => {
    const collectionName = "medicines";

    try {
        // Fetch all documents in the collection 
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

                /* CONDITION 1 */
                // Now compare the filepath if its the same as cached path
                if (medsData.entities[x].pils[0]) {
                    newPath = medsData.entities[x].pils[0].activePil.file.name;

                    // The cached path has replaced spaces with '%20'
                    // If new path is the same as currentPath
                    if (decodeURIComponent(cachedPath) === newPath) {
                        console.log(`${cachedPath} = ${newPath}`);

                        // Call requestDocument() with new path 
                        token = await requestToken(tokenOptions);
                        let newPILDoc = await requestDocument(token, encodeURIComponent(newPath));                      

                        console.log(newPILDoc);

                        // Fetch the current document's data
                        let documentSnapshot = await firestore.collection("files").doc(cachedPath).get();
                        let cachedDocument = documentSnapshot.data();

                        // If there is a document cached
                        if (cachedDocument) {
                            console.log("cacheDocument: ", cachedDocument.doc);

                            // Convert to Buffer if they're not already (this step may be unnecessary if they are already Buffers)
                            const newDocumentBuffer = Buffer.from(newPILDoc);
                            const cachedDocumentBuffer = Buffer.from(cachedDocument.doc);
    
                            // Compare the two documents using Buffer.compare
                            const isEqual = Buffer.compare(newDocumentBuffer, cachedDocumentBuffer) === 0;
    
                            /* CONDITION 1 */
                            if (isEqual) {
    
                                console.log(`No new updates`);
                            } 
    
                            /* CONDITION 1. */
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

                                const docSize = estimateFirestoreDocumentSize(newPILDoc);
                                console.log(`Estimated document size: ${docSize} bytes`);

                                // Check if the document is within Firestore's size limits
                                if (docSize > 1048487) {
                                    console.log('The document is too large to store in Firestore.');
                                } else {

                                    // Safe to write the document to Firestore
                                    // Update file collection
                                    await firestore.collection("files").doc(newPath).delete();
                                    await firestore.collection("files").doc(newPath).set(data)
            
                                    console.log("Cached to server!");
                                }
   
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


// TODO: Vercel has a setup for cron jobs, establish that
export const job = cron.schedule('*/45 * * * * *', weeklyCachePIL, {
    scheduled: true,
    timezone: "Europe/London"
});

job.start();