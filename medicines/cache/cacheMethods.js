
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

// Method to check if user is up to date
// TODO: Clean code
// TODO: Add another bool value before counting whether medicine has new document or not
export const notifications = async (medicines) => {
    let count = 0;
    let subscriptions = [];

    // Iterate through each medicine object
    for (const medicine of medicines) {
        console.log(`Processing: ${medicine.id}`);
        const cachedMedicine = await firestore.collection("medicines").doc(medicine.id).get();
        const cachedMedData = cachedMedicine.data();

        let pil, spc;
        
        // CONDITION: If there is a PIL path from medicines collection
        if (cachedMedData.pilPath !== '') {
            console.log(`Pil path found: `, cachedMedData.pilPath);
            const cachedPath = cachedMedData.pilPath; 
            const cachedFiles = await firestore.collection("files").doc(cachedMedData.pilPath).get();
            const cachedDoc = cachedFiles.data();
            
            console.log(cachedDoc);

            // CONDITION: If user has a PIL
            if (medicine.pil.doc !== '') {
                console.log(`User has cached PIL`);

                let isEqual = compareBuffer(medicine.pil.doc, cachedDoc.doc);
                        
                if (isEqual) { 
                    console.log(`No new updates`);

                    pil = {
                        path: cachedPath,
                        doc: cachedDoc,
                        available: true,
                        notifications: false
                    };

                } else {
                    console.log(`New update for PIL`);
                    pil = {
                        path: cachedPath,
                        doc: cachedDoc,
                        available: true,
                        notifications: true
                    };

                    console.log(`Added count`);
                    count++;
                }
            } 

            // CONDITION : If user has no PIL 
            else {
                console.log(`User has no cached PIL`);

                // CONDITION: There is cachedPath
                if (cachedPath !== '') {
                    console.log(`Cached path found for PIL`);
                    const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
                    const cachedDoc = cachedFiles.data();
                    
                    console.log(cachedDoc);

                    // If there is a cached Doc
                    if (cachedDoc) {
                        pil = {
                            path: cachedPath,
                            doc: cachedDoc,
                            available: true,
                            notifications: true
                        };

                        console.log(`Added count`);
                        count++;

                    } else {
                        pil = {
                            path: cachedPath,
                            doc: '',
                            available: true,
                            notifications: false
                        };

                    }

                } else {
                    console.log(`No cached path found`);
                    pil = {
                        path: '',
                        doc: '',
                        available: false
                    };
                }

            }
            
        } 
        
        // CONDITION: If there is no PIL path from medicines collection
        else {
            console.log(`No available PIL`);

            pil = {
                path: '',
                doc: '',
                available: false,
                notifications: false,
            };
        }
        
        // CONDITION: If there is a SPC path from medicines collection
        if (cachedMedData.spcPath !== '') {
            const cachedPath = cachedMedData.spcPath; 
            console.log(`SPC path found: `, cachedPath);
            const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
            const cachedDoc = cachedFiles.data();

            // CONDITION: If user has a SPC
            if (medicine.spc.doc !== '') {
                console.log(`User has cached SPC`);
                let isEqual = compareBuffer(medicine.spc.doc, cachedDoc.doc);
                        
                if (isEqual) { 
                    console.log(`No new updates`);

                    spc = {
                        path: cachedPath,
                        doc: cachedDoc,
                        available: true,
                        notifications: false
                    };

                } else {
                    console.log(`New update for PIL`);
                    spc = {
                        path: cachedPath,
                        doc: cachedDoc,
                        available: true,
                        notifications: true
                    };

                    console.log(`Added count`);
                    count++;
                }
            } 

            // CONDITION : If user has no SPC 
           else {
                console.log(`User has no cached SPC`);

                // CONDITION: There is cachedPath
                if (cachedPath !== '') {
                    console.log(`Cached path for SPC found`);

                    const cachedFiles = await firestore.collection("files").doc(cachedPath).get();
                    const cachedDoc = cachedFiles.data();
                    
                    // If there is a cached Doc
                    if (cachedDoc) {
                        spc = {
                            path: cachedPath,
                            doc: cachedDoc,
                            available: true,
                            notifications: true
                        };

                        console.log(`Added count`);
                        count++;

                    } else {
                        spc = {
                            path: cachedPath,
                            doc: '',
                            available: true,
                            notifications: false
                        };

                    }

                } else {
                    console.log(`No cached path for SPC found`);

                    spc = {
                        path: '',
                        doc: '',
                        available: false,
                        notifications: false
                    };
                }

            }
            
        } 

        // CONDITION: If there is no SPC path from medicines collection 
        else {
            console.log(`No available SPC`);

            spc = {
                path: '',
                doc: '',
                available: false,
                notifications: false
            };
        }

        subscriptions.push({
            medicineID: medicine.id,
            medicineName: medicine.name,
            company: cachedMedData.company, 
            activeIngredients: cachedMedData.activeIngredients, 
            pil: pil,
            spc: spc   
        });

    };

    // console.log(subscriptions);
    console.log(`Count:`, count);

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