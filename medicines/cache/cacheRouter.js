import express from 'express';
import admin from 'firebase-admin';
import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestDocument } from '../methods.js';

const router = express.Router();

// Endpoint to cache medicine
router.get('/cacheMed', async (req, res) => {
    try {
        const { id, name, activeIngredient, company, status, pil, spc } = req.query;
        console.log("ID:", id);

        const pilPath = pil.replace(/ /g, "_");
        const spcPath = spc.replace(/ /g, "_");

        const documentID = id;
        const collectionName = "medicines";

        let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();

        if (!documentSnapshot.exists) {
            console.log(`Caching to server with new documentID: ${documentID}`);

            const data = {
                name: name,
                activeIngredient: activeIngredient,
                company: company,
                status: status,
                pilPath: pilPath,
                spcPath: spcPath
            };

            try {
                await firestore.collection(collectionName).doc(documentID).set(data);
                
                console.log("Cached to server!");
            } catch (error) {

                console.error("An error occurred at /cacheMed:", error);
            } 

        } else {
            console.log(`Medicine is already cached`);
        }

    } catch (error) {
        console.error("An error occured at /cacheMed:", error);
    }
});

// Endpoint to get cache document
router.get('/grabCache', async (req, res) => {
    const { uploadPath } = req.query;

    console.log(uploadPath);

    // Replace space with _ for firestore
    const documentID = uploadPath.replace(/ /g, "_");
    console.log(documentID);

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
            const document = await requestDocument(token, encodeURIComponent(uploadPath));
 
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
                
                res.type('application/pdf').send(data);
            } 
        }

    } catch (error) {
      console.error(`Error fetching data: ${error}`);
    }
});


// TODO: Check user's current documents and see if it's the same as files
// Note: if the document is not present, that means it's either not cached OR the new file is bigger than the limit

export default router;