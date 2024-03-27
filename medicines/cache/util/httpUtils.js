import { requestToken, requestDocument, requestList } from "../../methods.js";
import { tokenOptions } from "../../tokenOptions.js";

// Method to fetch medicine search results
export const getMedicineList = async (name) => {
    console.log(`Getting medicine list for: `, name);

    const token = await requestToken(tokenOptions);
    console.log(`Got token`);

    const response = await requestList(token, name);
    console.log(`Got response`);

    const status = response.status
    const list = response.list;

    if (status === 200) {
        console.log(`Returning list`);
        return list;
    } else {
        return [];
    }
};

// Method to get new document 
export const getNewDocument = async (path) => {
    const token = await requestToken(tokenOptions);
    const response = await requestDocument(token, path);

    const status = response.status;
    const document = response.pdfBuffer;

    if (status === 200) {
        return document;
    } else {
        return '';
    }
};