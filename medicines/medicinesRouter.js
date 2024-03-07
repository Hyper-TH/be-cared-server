import express from 'express';
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
                // If document is above limit
                // Not cached
                // Send it directly to client
                res.type('application/pdf').send(data); 
            }
        }

    } catch (error) {
      console.error(`Error fetching data: ${error}`);
    }
});

export default router;