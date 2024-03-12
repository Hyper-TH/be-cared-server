import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestList, requestDocument } from '../methods.js';

function estimateFirestoreDocumentSize(object) {
    const jsonString = JSON.stringify(object);

    // Assuming the environment uses UTF-16 encoding (JavaScript's default string encoding)
    return new Blob([jsonString]).size;
}

/* CONDITION 1: cachedPath === newPath  */
export const condition1 = async (cachedPath, newPath) => {
    console.log(`${cachedPath} = ${newPath}`);

    // Call requestDocument() with new path 
    // The cached path has replaced spaces with '%20'
    const token = await requestToken(tokenOptions);
    const newPILDoc = await requestDocument(token, encodeURIComponent(newPath));                      

    console.log(newPILDoc);

    // Fetch the current document's data
    const documentSnapshot = await firestore.collection("files").doc(cachedPath).get();
    const cachedDocument = documentSnapshot.data();

    return [ newPILDoc, cachedDocument ];
};  

/* CONDITION 1.1: cachedPath has a cachedDocument */
export const condition1_1 = async (cachedDocument, newPILDoc) => {
    console.log(`cachedDocument: `, cachedDocument.doc, `\n`);

    // TODO: Buffer comparer shorten this!
    // Convert to Buffer if they're not already (this step may be unnecessary if they are already Buffers)
    const newDocumentBuffer = Buffer.from(newPILDoc);
    const cachedDocumentBuffer = Buffer.from(cachedDocument.doc);

    // Compare the two documents using Buffer.compare
    const isEqual = Buffer.compare(newDocumentBuffer, cachedDocumentBuffer) === 0;

    return isEqual;
};

/* CONDITION 1.1.b cachedDocument != newDocument */
export const condition1_b = async (cachedPath, newPath, newPILDoc) => {
    console.log(`cachedDoc != newDoc`);

    try {
        const data = {
            doc: newPILDoc
        }

        const docSize = estimateFirestoreDocumentSize(newPILDoc);
        console.log(`Estimated document size: ${docSize} bytes`);

        /* CONDITION 1.1.c: newDocument is above limit */
        if (docSize > 1048487) {
            // Still delete the outdated document
            await firestore.collection("files").doc(cachedPath).delete();
            console.log('The document is too large to store in Firestore.');
        } 

        /* CONDITION 1.1.d: newDocument is below limit */
        else {
            // Update file collection
            await firestore.collection("files").doc(cachedPath).delete();
            await firestore.collection("files").doc(newPath).set(data);
            
            console.log("Cached to server!");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    } 
};

/* CONDITION 1.2: cachedPath does not have a cachedDocument */
export const condition1_c = async (newPILDoc, newPath) => {
    console.log(`newPath does not exist in the files collection`);

    try {
        const data = {
            doc: newPILDoc
        }

        const docSize = estimateFirestoreDocumentSize(newPILDoc);
        console.log(`Estimated document size: ${docSize} bytes`);

        /* CONDITION 1.1.c: newDocument is above limit */
        if (docSize > 1048487) {
            console.log('The document is too large to store in Firestore.');
            await firestore.collection("files").doc(newPath).delete();
        } 
        
        /* CONDITION 1.1.d: newDocument is below limit */
        else {

            // Update file collection
            await firestore.collection("files").doc(newPath).delete();
            await firestore.collection("files").doc(newPath).set(data);

            console.log("Cached to server!");
        }

    } catch (error) {
        console.log(`Could not cache due to exceeding limits!`);

        console.error("An error occurred:", error);
    } 
};