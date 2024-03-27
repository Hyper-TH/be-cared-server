import { firestore } from "../../../config/config.js";

export const getCachedDoc = async (path) => {
    console.log(`Path found: `, path);

    const cachedFile = await firestore.collection("files").doc(path).get();
    const cachedDoc = cachedFile.data();

    return cachedDoc;
};