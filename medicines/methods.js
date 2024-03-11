import https from 'https';

// Method to get token
export async function requestToken(options) {
    return new Promise((resolve, reject) => {
        https.get(options, (response) => {
            let result = '';

            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', function () {
                try {
                    const token = result.match(/access_token&q;:&q;(\w+)/)[1];

                    resolve(token);
                } catch (error) {
                    console.error('Error:', error);

                    reject(error);
                }
            });

            response.on('error', function (error) {
                console.error('Error:', error);
                reject(error);
            });
        });
    });
}

// Method to get list of medicines in JSON format
export async function requestList(token, search) {
    // Remove spaces at start and end (needed)
    const trimmedSearch = search.trim();

    const option2 = {
        host: "backend-prod.medicines.ie",
        path: `/api/v1/medicines?published=true&expand=company%2Cingredients%2CactiveSPC%2Cpils.activePil%2CotherDocs.activeDoc%2CadditionalComs.activeCom&page=1&per-page=25&query=${encodeURIComponent(trimmedSearch)}`,
        headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`,
            sec_ch_ua: "\"Chromium\";v=\"118\", \"Opera GX\";v=\"104\", \"Not=A?Brand\";v=\"99\"",
            sec_ch_ua_mobile: "?0",
            sec_ch_ua_platform: "\"Windows\"",
            Referer: "https://www.medicines.ie/",
            Referrer_Policy: "strict-origin-when-cross-origin"
        }
    };

    return new Promise((resolve, reject) => {
        https.get(option2, (response) => {
            let result = '';

            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', function () {
                try {
                    const parsed = JSON.parse(result);
                    
                    console.log(parsed);
                    
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

// Method to request SPC/PIL
export async function requestDocument(token, uploadPath) {

    console.log("Upload path: ", uploadPath);

    const options = {
        host: "backend-prod.medicines.ie",
        path: `/uploads/files/${uploadPath}`,
        headers: {
            accept: "application/pdf",
            authorization: `Bearer ${token}`,
            Referer: "https://www.medicines.ie/",
            Referrer_Policy: "strict-origin-when-cross-origin"
        }
    };

    return new Promise((resolve, reject) => { 

        https.get(options, (response) => {
            const pdfChunks = [];
            
            // This should keep going until no more data coming in
            response.on('data', (chunk) => { 
                // console.log("Pushed", chunk);

                pdfChunks.push(chunk);
            });

            response.on('end', () => {
                // Check if the connection was closed prematurely
                if (!response.complete) {
                    reject(new Error('Incomplete response'));
                    
                    return;
                }
        
                // This event indicates that the response has been completely received.
                const pdfBuffer = Buffer.concat(pdfChunks);
                // console.log(pdfBuffer.toString('utf-8'));
                
                resolve(pdfBuffer);                
            });
            
            // To check if 200 or not
            console.log(response.statusCode);

            response.on('error', (error) => {
                console.error(`Error retrieving PDF: `, error);
                reject(error);
            });
    
            response.on('close', () => {
                // The connection was closed prematurely
                reject(new Error('Connection closed prematurely'));
            });
        });
    });
};