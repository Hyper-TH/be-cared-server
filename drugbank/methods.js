import https from 'https';

const regex = /<input type="hidden" name="authenticity_token" value="([^"]*)"[^>]*\/?>/;

// Method to get cookie
async function getCookie() {
    const response = await fetch("https://go.drugbank.com/drug-interaction-checker");
    const cookies = response.headers.get('set-cookie');

    // Parse cookies to extract name and value
    if (cookies) {
        const [name, value] = cookies.split('=');
        
        const [cookie, extra] = value.split(';');

        return cookie;
    } else {
        console.log('No cookies found in response');
    }  
};

// Method to get token
export async function getToken() {
    let authToken = "";

    const options = {
        host: "go.drugbank.com",
        path: "/drug-interaction-checker",
        headers: {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            accept_language: "en-US,en;q=0.9",
            sec_ch_ua: "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            sec_ch_ua_mobile: "?0",
            sec_ch_ua_platform: "\"Windows\"",
            sec_fetch_dest: "document",
            sec_fetch_mode: "navigate",
            sec_fetch_site: "none",
            sec_fetch_user: "?1",
            upgrade_insecure_requests: "1"
        },
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET"
    };

    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            let result = '';
    
            res.on('data', function (chunk) {
                result += chunk;
            });
    
            res.on('end', function () {
                const match = regex.exec(result);
    
                if (match && match.length > 1) {
                    authToken = match[1];
    
                    resolve(authToken);
                } else {
                    console.log("Authenticity token not found.");
                }        
            });

            res.on('error', function (error) {
                console.error('Error:', error);
            });
        })
    })
};

// Function to get list of medicines in JSON format
export async function autoComplete(input) {
    
    const option = {
        host: "go.drugbank.com",
        path: `/interaction_concept_search?term=${input}&_type=query&q=${input}`,
        headers: {
            accept: "*/*",
            accept_language: "en-US,en;q=0.9",
            sec_ch_ua: "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            sec_ch_ua_mobile: "?0",
            sec_ch_ua_platform: "\"Windows\"",
            sec_fetch_dest: "empty",
            sec_fetch_mode: "cors",
            sec_fetch_site: "same-origin",
            Referer: "https://go.drugbank.com/drug-interaction-checker",
            Referrer_Policy: "strict-origin-when-cross-origin"
        },
        body: null,
        method: "GET"
    };

    return new Promise((resolve, reject) => {
        https.get(option, (response) => {
            let result = '';

            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', function () {
                try {
                    const parsed = JSON.parse(result);

                    resolve(parsed);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            });

            response.on('error', function (error) {
                console.error('Error:', error);
            });
        });
    });
};
 
// Return HTML interaction
export async function getInteractions(token, drugsArray) {

    const queryString = drugsArray.map(drug => `product_concept_ids%5B%5D=${encodeURIComponent(drug.id)}&product_concept_names%5B%5D=${encodeURIComponent(drug.name)}`).join('&');

    const cookie = await getCookie();
    
    return new Promise((resolve, reject) => {
    fetch('https://go.drugbank.com/drug-interaction-checker', {
		method: 'POST',
		headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            // 'Content-Length': '269', // If uncommented theres errors LOL
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `_omx_drug_bank_session=${cookie}`,
            'DNT': '1',
            'Host': 'go.drugbank.com',
            'Origin': 'https://go.drugbank.com',
            'Referer': 'https://go.drugbank.com/drug-interaction-checker',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
		},
        body: `authenticity_token=${token}&${queryString}button=`
	    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return response.text(); // Get response body as text
        })
        .then(html => {
            resolve(html)
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
    })
};

// Get Food Interactions
export async function getFoodInteractions(token, drugsArray) {

    const queryString = drugsArray.map(drug => `product_concept_ids%5B%5D=${encodeURIComponent(drug.id)}&product_concept_names%5B%5D=${encodeURIComponent(drug.name)}`).join('&');

    const cookie = await getCookie();

    return new Promise((resolve, reject) => {
    fetch('https://go.drugbank.com/food-interaction-checker', {
		method: 'POST',
		headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            // 'Content-Length': '269', // If uncommented theres errors LOL
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `_omx_drug_bank_session=${cookie}`,
            'DNT': '1',
            'Host': 'go.drugbank.com',
            'Origin': 'https://go.drugbank.com',
            'Referer': 'https://go.drugbank.com/drug-interaction-checker',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
		},
        body: `authenticity_token=${token}&${queryString}button=`
	    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            return response.text(); // Get response body as text
        })
        .then(html => {
            resolve(html);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
    })
};