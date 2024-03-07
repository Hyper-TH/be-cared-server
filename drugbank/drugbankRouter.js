import express from 'express';
import { autoComplete, getInteractions, getFoodInteractions, getToken } from './methods.js';
import { foodParser, drugParser } from './htmlParsers.js';

const router = express.Router();

router.get('/autoComplete', async (req, res) => {
    try {
        const { input } = req.query;
        const drugsData = await autoComplete(input);

        res.json({ drugs: drugsData });
        
    } catch (error) {
        console.error('Error:', error);

        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/interactions', async (req, res) => {

    try {
        const { drugs } = req.query;

        if (!drugs) {
            return res.status(400).json({ error: "Drugs parameter is missing" });
        }

        // Decode the URL-safe string back to JSON
        const decodedDrugs = decodeURIComponent(drugs);
        
        // Parse the JSON string into an array
        const drugsArray = JSON.parse(decodedDrugs);

        const token = await getToken();
        const interactions = await getInteractions(token, drugsArray);

        const interactionResults = await drugParser(interactions);

        res.json({ interactions: interactionResults });

    } catch (error) {
        console.error(`Error processing request: ${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/foodInteractions', async (req, res) => {

    try {
        const { drugs } = req.query;

        if (!drugs) {
            return res.status(400).json({ error: "Drugs parameter is missing" });
        }

        // Decode the URL-safe string back to JSON
        const decodedDrugs = decodeURIComponent(drugs);
        
        // Parse the JSON string into an array
        const drugsArray = JSON.parse(decodedDrugs);

        const token = await getToken();
        const interactions = await getFoodInteractions(token, drugsArray);

        const interactionResults = await foodParser(interactions);

        res.json({ interactions: interactionResults });

    } catch (error) {
        console.error(`Error processing request: ${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;