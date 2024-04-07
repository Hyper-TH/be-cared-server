import { firestore } from '../../config/config.js';
import { getCachedDoc } from './util/firestoreUtils.js';
import { compareBuffer } from './util/compareBuffer.js';

// Method to check if user is up to date
export const notifications = async (medicines) => {
    let count = 0;
    let subscriptions = [];

    const medicineEntries = Object.entries(medicines);

    // Iterate through each medicine object
    for (const [id, medicineData] of medicineEntries) {
        console.log(`Processing: ${id}`);
        const cachedMedicine = await firestore.collection("medicines").doc(id).get();
        const cachedMedData = cachedMedicine.data();

        let pil, spc;
        
        // CONDITION: If there is a PIL path from medicines collection
        if (cachedMedData.pilPath !== '') {
            const cachedPath = cachedMedData.pilPath; 

            console.log(`Pil path found: `, cachedPath);
            const cachedDoc = await getCachedDoc(cachedPath);
            
            // CONDITION: If user has a PIL
            if (medicineData.pil.doc !== '') {
                console.log(`User has cached PIL`);

                let isEqual = compareBuffer(medicineData.pil.doc, cachedDoc.doc);
                        
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

                    count++;
                }
            } 

            // CONDITION : If user has no PIL 
            else {
                console.log(`User has no cached PIL`);

                // CONDITION: There is cachedPath
                if (cachedPath !== '') {
                    console.log(`Cached path found for PIL`);
                    const cachedDoc = await getCachedDoc(cachedPath);

                    // If there is a cached Doc
                    if (cachedDoc) {
                        pil = {
                            path: cachedPath,
                            doc: cachedDoc,
                            available: true,
                            notifications: true
                        };

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
        
        else {
            console.log(`No available PIL`);

            // If user has no PIL
            pil = {
                path: '',
                doc: '',
                available: false,       // Ensure that the button becomes inaccessible
                notifications: false,
            };

        }
        
        // CONDITION: If there is a SPC path from medicines collection
        if (cachedMedData.spcPath !== '') {
            const cachedPath = cachedMedData.spcPath; 

            console.log(`SPC path found: `, cachedPath);
            const cachedDoc = await getCachedDoc(cachedPath);

            // CONDITION: If user has a SPC
            if (medicineData.spc.doc !== '') {
                console.log(`User has cached SPC`);

                let isEqual = compareBuffer(medicineData.spc.doc, cachedDoc.doc);
                        
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

                    const cachedDoc = await getCachedDoc(cachedPath);
                    
                    // If there is a cached Doc
                    if (cachedDoc) {
                        spc = {
                            path: cachedPath,
                            doc: cachedDoc,
                            available: true,
                            notifications: true
                        };

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
            medicineID: id,
            medicineName: medicineData.name,
            company: cachedMedData.company, 
            activeIngredients: cachedMedData.activeIngredients, 
            pil: pil,
            spc: spc   
        });

    };

    return [ subscriptions, count ];
};
