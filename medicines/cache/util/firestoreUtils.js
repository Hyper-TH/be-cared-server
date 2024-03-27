import { firestore } from "../../../config/config.js";

// Method to get user's subscription list of medicines
export const getUserMeds = async (user) => {
    const userDoc = await firestore.collection("users").doc(user).get();
    const userData = userDoc.data();
    const userMedicines = userData.medicines || {};

    return userMedicines;
};

// Method to get the new version of medicine
export const getNewMedsData = async (medicineID, medicineName) => {

    // Get the first result of searchList
    const token = await requestToken(tokenOptions);
    const medsList = await requestList(token, medicineName);

    // Initialize x to 0 to start from the first index of medsData.entities
    let x = 0;
    let found = false; // Flag to indicate whether a match is found

    // Loop through medsData.entities until a match is found or the end of the array is reached
    while (x < medsList.entities.length && !found) {
        if ((medsList.entities[x].id).toString() === medicineID) {
            // If a match is found, log the matching entity and set found to true
            console.log(`Match found:`);
            // console.log(`${medsData.entities[x].name} == ${medicineName}`);

            found = true;
        } else {
            // If no match, increment x to check the next entity
            console.log("Incremented X");

            x = x + 1;
        }
    }   // end while

    const medsData = medsList.entities[x];

    return [found, medsData];
};

// Method to get medicine's cached path
export const getCachedPath = async (type, id) => {
    const medsDoc = await firestore.collection("medicines").doc(id).get();
    const medsData = medsDoc.data();
    const cachedPath = medsData[type + "Path"];

    return cachedPath;
}; 

// Method to get medicine's cached doc
export const getCachedDoc = async (path) => {
    console.log(`Path found: `, path);

    const cachedFile = await firestore.collection("files").doc(path).get();
    const cachedDoc = cachedFile.data();

    return cachedDoc;
};