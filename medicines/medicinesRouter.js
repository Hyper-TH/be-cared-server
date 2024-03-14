import express from 'express';
import admin from 'firebase-admin';
import { firestore } from '../config/config.js';
import { notifications } from './cache/cacheMethods.js';
import { estimateFirestoreDocumentSize } from './cache/util/estimateFirestoreDocumentSize.js';
import { getNewDocument } from './cache/util/getNewDocument.js';
import { getMedicineList } from './cache/util/getMedicineList.js';

const router = express.Router();

// Endpoint to get list of medicines
router.get('/getMeds', async (req, res) => {
    try {
        const { medQuery } = req.query;

        if (!medQuery) {
            return res.status(400).json({ error: 'Medicine is required' });
        } else {
            const medsData = await getMedicineList(medQuery);

            res.json({ medicines: medsData });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to subscribe the medicine
router.get('/subscribe', async (req, res) => {
    const { user, id, name, pil, spc } = req.query;
    const collectionName = "users";
    let pilDoc, spcDoc, newPIL, newSPC, pilSize, spcSize;

    try {
        // If there is a pilPath
        if (pil.length > 0) {
            console.log(`PIL: ${pil}`);
            console.log(`Found cached PIL path, grabbing document now...`);
            pilDoc = await getNewDocument(encodeURIComponent(pil));
        } else {
            pilDoc = '';
        }
        
        if (spc.length > 0) {
            console.log(`SPC: ${spc}`);
            console.log(`Found cached SPC path, grabbing document now...`);            
            spcDoc = await getNewDocument(encodeURIComponent(spc));
        } else {
            spcDoc = '';
        }

        console.log(`PIL Length: `, pilDoc.length);
        console.log(`SPC Length: `, spcDoc.length);

        // If pilDoc is !== '', check the size
        if (pilDoc.length != 0) {
            pilSize = estimateFirestoreDocumentSize(pilDoc);            
        } else {
            pilSize = true;
        }

        // If spcDoc is !== '', check the size
        if (spcDoc.length != 0) {
            spcSize = estimateFirestoreDocumentSize(spcDoc);
        } else {
            spcSize = true;
        }

        // If true, then it's not cachable
        if (pilSize && spcSize) {
            newPIL = { doc: '', cachable: false };
            newSPC = { doc: '', cachable: false };
        } else if (!pilSize && spcSize) {
            newPIL = { doc: pilDoc, cachable: true };
            newSPC = { doc: '', cachable: false };
        } else if (pilSize && !spcSize) {
            newPIL = { doc: '', cachable: false };
            newSPC = { doc: spcDoc, cachable: true };
        } else {
            newPIL = { doc: pilDoc, cachable: true };
            newSPC = { doc: spcDoc, cachable: true };
        }


        let data = {
            id: id,
            name: name,
            pil: newPIL,
            spc: newSPC
        };
        
        // TODO: Handle Error when there are two PIL documents
        // Panadol Actifast has two
        console.log(`New PIL:`, pilDoc);
        console.log(`New SPC:`, spcDoc);

        // Use arrayUnion to add 'data' to the 'medicines' array field of the document.
        // If 'medicines' doesn't exist, it will be created.
        // If 'data' already exists in the 'medicines' array, it won't be added again (to prevent duplicates).
        await firestore.collection(collectionName).doc(user).update({
            medicines: admin.firestore.FieldValue.arrayUnion(data)
        });

        // Optionally, fetch the updated document to confirm or send back the updated array
        let documentSnapshot = await firestore.collection(collectionName).doc(user).get();
        const documentData = documentSnapshot.data();
        
        // Responding with the updated medicines array
        res.json({ medicines: documentData.medicines });



    } catch (error) {
        console.error("An error occured: ", error);
    }
});

// Endpoint to check if user has subscribed to the medicine
router.get('/checkSub', async (req, res) => {
    try {
        const { user, id } = req.query;
        const collectionName = "users";
        
        // Fetch the current user's document to check existing medicines
        const userDoc = await firestore.collection(collectionName).doc(user).get();

        if (!userDoc.exists) {
            return res.status(404).send("User not found.");
        }

        const userData = userDoc.data();
        const existingMedicines = userData.medicines || [];
        
        // Check if the medicine with the given name already exists
        const medicineExists = existingMedicines.some(medicine => medicine.id === id);
        
        if (medicineExists) {
            return res.json({ exists: true, message: "Medicine already exists in the user's medicines array." });
        } else {
            return res.json({ exists: false, message: "Medicine does not exist in the user's medicines array." });
        }
        
    } catch (error) {
        console.error("An error occurred: ", error);
        return res.status(500).send("An error occurred while processing your request.");
    }
});

// TODO: IF NO PIL, CACHABLE MUST BE FALSE (its returning true)
// Endpoint to get list of subscribed medicines
router.get('/getSubs', async (req, res) => {
    const { user } = req.query; 
    const collectionName = "users";

    try {
        // Fetch the current user's document to check existing medicines
        const userDoc = await firestore.collection(collectionName).doc(user).get();

        if (!userDoc.exists) {
            console.error("User document does not exist.");
            return res.status(404).send("User not found.");
        }

        const documentData = userDoc.data();
        const medicines = documentData.medicines;

        // Check if the medicines array exists in the document to avoid undefined errors
        if (medicines.length > 0) {

            const [ subList, count ] = await notifications(medicines);

            console.log(subList);
            
            // Responding with the subscribed medicines array
            res.json({ medicines: subList, count: count });

        } else {
            // If the medicines array does not exist, respond with an empty array
            res.json({ medicines: [], count: 0 });
        }        
        
    } catch (error) {
        console.error("An error occurred: ", error);
        return res.status(500).send("An error occurred while processing your request.");
    }
});

// Endpoint to unsub the medicine TODO: Fix this
router.get('/unSub', async (req, res) => {
    const { user, id } = req.query; 
    const collectionName = "users";

    console.log(`Unsub called by ${user} with medicine: ${id}`);
    try {
        // Fetch the current user's document to check existing medicines
        const userDoc = await firestore.collection(collectionName).doc(user).get();
        const documentData = userDoc.data();

        // Check if the medicines array exists in the document to avoid undefined errors
        if (documentData.medicines) {

            // Filter the array to exclude the medicine with the specified name
            const updatedMedicines = documentData.medicines.filter(medicine => medicine.id !== id);

            // Update the document with the filtered medicines array
            await firestore.collection(collectionName).doc(user).update({
                medicines: updatedMedicines
            });
            
            // Responding with the new medicines array
            res.json({ medicines: updatedMedicines });

        } else {
            // If the medicines array does not exist, respond with an empty array
            res.json({ medicines: [] });
        }
                
    } catch (error) {
        console.error("An error occurred: ", error);
        return res.status(500).send("An error occurred while processing your request.");
    }
});

export default router;