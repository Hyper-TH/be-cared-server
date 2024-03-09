import express from 'express';
import { firestore } from '../config/config.js';
import { requestCookie, requestProductDetails, requestList } from './methods.js';
import { productListParser, productDetailsParser } from './htmlParsers.js';

const router = express.Router();

// Endpoint to get search results of products
router.get('/getProds', async (req, res) => {

    console.log(`Received request ${req}`);

    try {
        const { prodQuery, searchType } = req.query;

        if (!prodQuery) {
            return res.status(400).json({ error: 'Product is required '});
        } else {
            const cookie = await requestCookie();
            const prodsList = await requestList(cookie, prodQuery, searchType);
            const prodsData = await productListParser(prodsList, searchType);

            // Assuming requestList returns an array of drugs
            res.json({ products: prodsData });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Endpoint to get product details
router.get('/getProduct', async (req, res) => {
    const { uploadPath } = req.query;

    console.log(`Got ${uploadPath}`);

    // Replace / with _ for firestore
    const documentID = uploadPath.replace(/[\/]/g, "_");

    const collectionName = "products";

    try {
        let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();

        if (documentSnapshot.exists) {
            console.log(`Found cached product`);
            const productData = documentSnapshot.data();

            res.type('json').send(productData);

        } else {
            console.log(`Caching to server with new documentID: ${documentID}`);

            console.log(`Sending ${uploadPath}`);
            const html = await requestProductDetails(uploadPath);

            // Parse HTML file and receive details in JSON format
            const productDetails = await productDetailsParser(html, uploadPath)

            const data = {
                doc: productDetails
            }

            try {
                await firestore.collection(collectionName).doc(documentID).set(data);

                console.log("Cached to server!");

                let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();
                const productData = documentSnapshot.data();

                res.type('json').send(productData);

            } catch (error) {
                console.error('an error occured:', error);

                res.send({ error: 'Failed' });
            }
        }

    } catch (error) {
        console.error(`Error fetching data: ${error}`);
    }
});

export default router;