import cron from 'node-cron';
import { firestore } from '../../config/config.js';
import { equalPath, unequalDocuments, uncachedPath, unequalPaths, outdatedCache, unavailableMed } from './conditions.js';
import { getNewMedsData } from './util/getNewMedsData.js';
import { compareBuffer } from './util/compareBuffer.js';

// Method to cache PIL every week
const weeklyCachePIL = async () => {
    console.log("Job started");

    try {
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
            let newPath;

            console.log(`\nProcessing document with medName: ${medicineName} id: ${medicineID}`);

            try {
                const [ found, medsData ] = await getNewMedsData(medicineID, medicineName);

                if (medsData.pils[0]) {

                    newPath = medsData.pils[0].activePil.file.name;

                    if (decodeURIComponent(cachedPath) === newPath) {
                        let [ newPILDoc, cachedDoc ] = await equalPath(cachedPath, newPath);
                        
                        if (cachedDoc) {
                            let isEqual = compareBuffer(newPILDoc, cachedDoc);
                            
                            if (isEqual) { 
                                console.log(`No new updates`); 
                            } else {
                                await unequalDocuments(cachedPath, newPath, newPILDoc);
                            }
    
                        } else { 
                            await uncachedPath(newPILDoc, newPath); 
                        }                     

                    } else {
                        await unequalPaths(cachedPath, newPath, medicineID);
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


// TODO: Vercel has a setup for cron jobs, establish that
export const job = cron.schedule('*/59 * * * * *', weeklyCachePIL, {
    scheduled: true,
    timezone: "Europe/London"
});

// job.start();