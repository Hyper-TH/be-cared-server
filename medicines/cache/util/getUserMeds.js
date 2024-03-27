import { firestore } from "../../../config/config.js";

export const getUserMeds = async (user) => {
    const userDoc = await firestore.collection("users").doc(user).get();
    const userData = userDoc.data();
    const userMedicines = userData.medicines || {};

    return userMedicines;
};
