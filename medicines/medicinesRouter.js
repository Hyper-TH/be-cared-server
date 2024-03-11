import express from 'express';
import admin from 'firebase-admin';
import { firestore } from '../config/config.js';
import { tokenOptions } from './tokenOptions.js';
import { requestToken, requestList, requestDocument } from './methods.js'

const router = express.Router();

// Endpoint to get list of medicines
router.get('/getMeds', async (req, res) => {
    try {
        const { medQuery } = req.query;

        if (!medQuery) {
            return res.status(400).json({ error: 'Medicine is required' });
        } else {
            const token = await requestToken(tokenOptions);
            const medsData = await requestList(token, medQuery);

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

    try {

        // Fetch documents
        const token1 = await requestToken(tokenOptions);
        const token2 = await requestToken(tokenOptions);
        const pilDoc = await requestDocument(token1, pil);
        const spcDoc = await requestDocument(token2, spc);

        try {
            const pil = { doc: pilDoc };
            const spc = { doc: spcDoc };

            let data = {
                id: id,
                name: name,
                pil: pil,
                spc: spc
            };

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
            console.error(error);

            let data = {
                id: id,
                name: name,
                pil: "",
                spc: ""
            };

            // Push it without the documents
            await firestore.collection(collectionName).doc(user).update({
                medicines: admin.firestore.FieldValue.arrayUnion(data)
            });         

            // Optionally, fetch the updated document to confirm or send back the updated array
            let documentSnapshot = await firestore.collection(collectionName).doc(user).get();
            const documentData = documentSnapshot.data();
            
            // Responding with the updated medicines array
            res.json({ medicines: documentData.medicines });

        }

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

        // Check if the medicines array exists in the document to avoid undefined errors
        if (documentData.medicines) {

            // Responding with the subscribed medicines array
            res.json({ medicines: documentData.medicines });
        } else {
            // If the medicines array does not exist, respond with an empty array
            res.json({ medicines: [] });
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