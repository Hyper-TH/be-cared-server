import { firestore } from "../../../config/config.js";

export const getCachedPath = async (type, id) => {
    const medsDoc = await firestore.collection("medicines").doc(id).get();
    const medsData = medsDoc.data();
    const cachedPath = medsData[type + "Path"];

    return cachedPath;
};  