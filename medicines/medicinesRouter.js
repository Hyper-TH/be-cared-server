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

// Endpoint to get cache document
router.get('/grabCache', async (req, res) => {
    const { uploadPath } = req.query;

    const documentID = uploadPath;
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
            const document = await requestDocument(token, uploadPath);
 
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

            } finally {
                // TODO: NOT WORKING
                // If document is above limit
                // Not cached
                // Send it directly to client
                // UPDATE: I think it's working? 
                // it just takes a while to send it?
                res.type('application/pdf').send(data); 
            }
        }

    } catch (error) {
      console.error(`Error fetching data: ${error}`);
    }
});

// Endpoint to subscribe the medicine
router.get('/subscribe', async (req, res) => {
    const { user, name, activeIngredient, company, pil, spc } = req.query;
    const collectionName = "users";

    const data = {
        activeIngredient: activeIngredient,
        company: company,
        name: name,
        pil: pil,
        spc: spc
    };
    
    console.log(`Pushing to server now...`);

    try {

        // Push new medicine object into 'medicines' array field of the user document
        await firestore.collection(collectionName).doc(user).update({
            medicines: admin.firestore.FieldValue.arrayUnion(data)
        });
        
        console.log("Medicine added to the user's medicines array!");

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
    const { user, name } = req.query;
    const collectionName = "users";

    try {
        // Fetch the current user's document to check existing medicines
        const userDoc = await firestore.collection(collectionName).doc(user).get();

        if (!userDoc.exists) {
            console.error("User document does not exist.");
            return res.status(404).send("User not found.");
        }

        const userData = userDoc.data();
        const existingMedicines = userData.medicines || [];
        
        // Check if the medicine with the given name already exists
        const medicineExists = existingMedicines.some(medicine => medicine.name === name);
        
        if (medicineExists) {
            console.log("Medicine with the given name already exists.");

            return res.json({ exists: true, message: "Medicine already exists in the user's medicines array." });
        } else {
            console.log("Medicine with the given name does not exist.");

            return res.json({ exists: false, message: "Medicine does not exist in the user's medicines array." });
        }
        
    } catch (error) {
        console.error("An error occurred: ", error);
        return res.status(500).send("An error occurred while processing your request.");
    }
});

// Endpoint to get list of subscribed medicines
router.get('/getSubs', async (req, res) => {
    const { user } = req.query; // Removed 'name' as it's not used in this snippet
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
            console.log(`Got list!`);

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


export default router;