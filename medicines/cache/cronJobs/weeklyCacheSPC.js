// TODO: READ FLAW HERE 
/* 
    In the case scenario where there is no cached document,
    and there is an updated document, there is (as of this moment)
    no way of telling if it has been "seen" before or not.

    Additionally, if the new document is new and not cachable,
    the server will mark this as uncachable, and therefore 
    the user side will still stay on the outdated document.
*/

import { firestore } from '../../../config/config.js';
import { 
    equalPath, unequalDocuments, uncachedPath, 
    unequalPaths, outdatedCache, unavailableMed 
} from '../conditions.js';
import { getNewMedsData } from '../util/firestoreUtils.js';
import { compareBuffer } from '../util/compareBuffer.js';

// Cron Job to cache SPC every week
const weeklyCacheSPC = async () => {
    console.log("Job started");
    const path = "spcPath";

    try {
        const querySnapshot = await firestore.collection("medicines").get();

        if (querySnapshot.empty) {
            console.log('No documents found.');
            return;
        }

        // Iterate over each document in the collection
        // Use a for...of loop to handle async operations
        for (const doc of querySnapshot.docs) {
            const cachedPath = doc.data().spcPath;
            const medicineID = doc.id;
            const medicineName = doc.data().name;
            let newPath;

            console.log(`\nProcessing document with medName: ${medicineName} id: ${medicineID}`);

            try {
                const [ found, medsData ] = await getNewMedsData(medicineID, medicineName);

                if (medsData.activeSPC.file) {

                    newPath = medsData.activeSPC.file.name;

                    if (decodeURIComponent(cachedPath) === newPath) {
                        let [ newSPCDoc, cachedDoc ] = await equalPath(cachedPath, newPath);
                        
                        if (cachedDoc) {
                            let isEqual = compareBuffer(newSPCDoc, cachedDoc.doc);
                            
                            if (isEqual) { 
                                console.log(`No new updates`); 
                            } else {
                                await unequalDocuments(cachedPath, newPath, newSPCDoc);
                            }
    
                        } else { 
                            await uncachedPath(newSPCDoc, newPath, path); 
                        }                     

                    } else {
                        await unequalPaths(cachedPath, newPath, medicineID, path);
                    }
                } else {
                    await outdatedCache(medicineID, cachedPath);
                }
                
                if (!found) {
                    await unavailableMed(medicineID);

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
