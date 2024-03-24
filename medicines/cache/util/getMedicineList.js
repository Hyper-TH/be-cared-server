import { requestToken, requestList } from "../../methods.js";
import { tokenOptions } from "../../tokenOptions.js";

export async function getMedicineList(name) {

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