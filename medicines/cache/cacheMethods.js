
// TODO: READ FLAW HERE 
/* 
    In the case scenario where there is no cached document,
    and there is an updated document, there is (as of this moment)
    no way of telling if it has been "seen" before or not.

    Additionally, if the new document is new and not cachable,
    the server will mark this as uncachable, and therefore 
    the user side will still stay on the outdated document.
*/

import  { CronJob } from 'cron';
import { firestore } from '../../config/config.js';
import { 
    equalPath, unequalDocuments, uncachedPath, 
    unequalPaths, outdatedCache, unavailableMed 
} from './conditions.js';
import { getNewMedsData } from './util/getNewMedsData.js';
import { compareBuffer } from './util/compareBuffer.js';

// Method to cache PIL every week
const weeklyCachePIL = async () => {
    
    console.log("Job started");
    console.trace('Trace at cron job execution');

    const path = "pilPath";

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
                        await unequalPaths(cachedPath, newPath, medicineID, path);
                    }
                } else {
                    await outdatedCache(medicineID, cachedPath, path);
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

// Method to cache PIL every week
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

                if (medsData.activeSPC.file.name) {

                    newPath = medsData.activeSPC.file.name;

                    if (decodeURIComponent(cachedPath) === newPath) {
                        let [ newSPCDoc, cachedDoc ] = await equalPath(cachedPath, newPath);
                        
                        if (cachedDoc) {
                            let isEqual = compareBuffer(newSPCDoc, cachedDoc);
                            
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

// Method to check if user is up to date
export const notifications = async (medicines) => {
    let count;
    let subscriptions = [];

    /*
        subscriptions: [
            {
                medicineID,
                medicineName,
                company,
                activeIngredient,
                pil: {
                    path,
                    doc: _bytestring,
                    available: BOOL
                },
                spc: {
                    path,
                    doc: _bytestring,
                    available: BOOL
                }
            },
            {

            }
        ]
    */

    // Iterate through each medicine object
    for (const medicine of medicines) {
        console.log(`Processing: ${medicine.id}`);
        const cachedMedicine = await firestore.collection("medicines").doc(medicine.id).get();
        const cachedMedData = cachedMedicine.data();

        let subMed = {};
        let pil;
        let spc;
        
        // CONDITION: If there is a PIL
        if (cachedMedData.pilPath !== '') {
            const cachedPath = cachedMedData.pilPath; 
            const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
            const cachedDoc = cachedFiles.data();
            
            console.log(cachedDoc);

            // CONDITION: If user has a PIL
            if (medicine.pil.doc !== '') {
                let isEqual = compareBuffer(medicine.pil.doc, cachedDoc.doc);
                        
                if (isEqual) { 
                    console.log(`No new updates`);
                } else {
                    console.log(`New update for PIL`);
                    count = count + 1;
                }

                pil = {
                    path: cachedPath,
                    doc: cachedDoc,
                    available: true
                };

            } 

            // CONDITION : If user has no PIL 
            else {
                const cachedPath = cachedMedData.pilPath; 

                if (cachedPath !== '') {
                    const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
                    const cachedDoc = cachedFiles.data();
    
                    pil = {
                        path: cachedPath,
                        doc: cachedDoc,
                        available: true
                    };
                } else {
                    pil = {
                        path: cachedPath,
                        doc: '',
                        available: false
                    };
                }


                count = count + 1;
            }
            
        } 
        
        // CONDITION: If there is no PIL
        else {
            const cachedPath = cachedMedData.pilPath; 
            console.log(`No available PIL`);

            if (cachedPath !== '') {
                const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
                const cachedDoc = cachedFiles.data();

                pil = {
                    path: cachedPath,
                    doc: cachedDoc,
                    available: true
                };

            } else {
                pil = {
                    path: cachedPath,
                    doc: '',
                    available: false
                };
            }
        }
        
        // CONDITION: If there is a SPC
        if (cachedMedData.spcPath !== '') {
            const cachedPath = cachedMedData.spcPath; 
            const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
            const cachedDoc = cachedFiles.data();

            // CONDITION: If user has a SPC
            if (medicine.spc.doc !== '') {
                let isEqual = compareBuffer(medicine.spc.doc, cachedDoc.doc);
                        
                if (isEqual) { 
                    console.log(`No new updates`);
                } else {
                    console.log(`New update for PIL`);
                    count = count + 1;
                }

                // TODO: Update when user clicks on renderButton
                spc = {
                    path: cachedPath,
                    doc: cachedDoc,
                    available: true
                };

            } 

            // CONDITION : If user has no SPC 
            else {
                const cachedPath = cachedMedData.spcPath; 
                const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
                const cachedDoc = cachedFiles.data();

                pil = {
                    path: cachedPath,
                    doc: cachedDoc,
                    available: true
                };

                count = count + 1;
            }
            
        } else {
            const cachedPath = cachedMedData.spcPath; 
            console.log(`No available SPC`);

            if (cachedPath !== '') {
                const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
                const cachedDoc = cachedFiles.data();

                pil = {
                    path: cachedPath,
                    doc: cachedDoc,
                    available: true
                };

            } else {
                pil = {
                    path: cachedPath,
                    doc: '',
                    available: false
                };
            }
        }
        
        subMed = {
            medicineID: medicine.id,
            medicineName: medicine.name,
            company: cachedMedData.company, 
            activeIngredient: cachedMedData.activeIngredient, 
            pil: pil,
            spc: spc        
        }

        subscriptions.push(subMed);

        // TODO: how will the user get updated? Perhaps update when they redirect!
    };

    console.log(subscriptions);

    return [ subscriptions, count ];
};

// TODO: Vercel has a setup for cron jobs, establish that
export const job = new CronJob(
    '*/20 * * * * *', 
    weeklyCachePIL, 
    null, 
    false,
    'Europe/London'
);

// job.start();