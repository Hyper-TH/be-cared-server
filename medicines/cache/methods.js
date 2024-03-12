import cron from 'node-cron';
import admin from 'firebase-admin';
import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestList, requestDocument } from '../methods.js';

import { condition1, condition1_1, condition1_b, condition1_c, newMedsData } from './conditions.js';

function estimateFirestoreDocumentSize(object) {
    const jsonString = JSON.stringify(object);

    // Assuming the environment uses UTF-16 encoding (JavaScript's default string encoding)
    return new Blob([jsonString]).size;
}

// Method to run every day/week
const weeklyCachePIL = async () => {
    console.log("Job started");

    try {
        // Fetch all documents in the collection 
        const querySnapshot = await firestore.collection("medicines").get();

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
            let docSize;
            let newPath;

            console.log(`\nProcessing document with medName: ${medicineName} id: ${medicineID}`);

            try {
                const [ found, medsData ] = await newMedsData(medicineID, medicineName);

                // Now compare the filepath if its the same as cached path
                // ROOT CONDITION: IF FOUND PIL 
                if (medsData.pils[0]) {

                    newPath = medsData.pils[0].activePil.file.name;

                    /* CONDITION 1: cachedPath === newPath  */
                    // If new path is the same as currentPath
                    if (decodeURIComponent(cachedPath) === newPath) {

                        console.log(`\nEntering Condition 1:`);
                        let [ newPILDoc, cachedDocument ] = await condition1(cachedPath, newPath);
                        
                        /* CONDITION 1.1: cachedPath has a cachedDocument */
                        if (cachedDocument) {

                            let isEqual = await condition1_1(cachedDocument, newPILDoc);
                            
                            /* CONDITION 1.1.a: cachedDocument is equal to newDocument*/
                            if (isEqual) { console.log(`No new updates`); } 
    
                            /* CONDITION 1.1.b cachedDocument is not equal to newDocument */
                            else {
                                await condition1_b(cachedPath, newPath, newPILDoc);
                            }
    
                        }  // end CONDITION 1.1

                        /* CONDITION 1.2: cachedPath does not have a cachedDocument */
                        else { await condition1_c(newPILDoc, newPath); }                     

                    } 

                    /* CONDITION 2: cachedPath !== newPath */
                    else {
                        console.log(`\nEntering Condition 1:`);

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
                        
                        try {
                            docSize = estimateFirestoreDocumentSize(newPILDoc);
                            console.log(`Estimated document size: ${docSize} bytes`);

                            /* CONDITION 1.1.c: newDocument is above limit */
                            if (docSize > 1048487) {
                                console.log('The document is too large to store in Firestore.');
                                await firestore.collection("files").doc(newPath).delete();
                            } 
                            
                            /* CONDITION 1.1.d: newDocument is below limit */
                            else {
                                const data = {
                                    doc: newPILDoc
                                }
    
                                // Update file collection
                                await firestore.collection("files").doc(newPath).delete();
                                await firestore.collection("files").doc(newPath).set(data);
        
                                console.log("Cached to server!");
                            }

                        } catch (error) {
                            console.log(`Could not cache due to exceeding limits!`);

                            console.error("An error occurred:", error);
                        } 
                    }

                } 
                
                // ROOT CONDITION: NO FOUND PIL
                else {

                    // Remove current PIL
                    console.log(`No new PIL for  ${medicineID} : ${medicineName} `);
                }
                
                // If no match is found after looping through all entities
                if (!found) {
                    console.log(`No PIL found in newer version of the medicine, removing PIL path now...`);

                    // Remove pilPath within medicines
                    await firestore.collection("medicines").doc(medicineID).update({
                        'pilPath': ''
                    });

                    console.log(`No match found for medicine ID: ${medicineID}`);
                }
            } catch (error) {
                console.error(`An error occurred while processing medicine ID: ${medicineID}:`, error);
            }
        };

    } catch (error) {
        console.error(`Error fetching documents: ${error}`);
    }
    
    console.log("Job Ended");
};  


// TODO: Vercel has a setup for cron jobs, establish that
export const job = cron.schedule('*/59 * * * * *', weeklyCachePIL, {
    scheduled: true,
    timezone: "Europe/London"
});

// job.start();