import https from 'https';
import fs from 'fs';	// For testing purposes only

// Method to get cookie
export async function requestCookie() {
	const response = await fetch("https://www.sigmaaldrich.com/IE/en/search/t1503?focus=products&page=1&perpage=30&sort=relevance&term=t1503&type=product_number");
	const cookie = response.headers.get('set-cookie');

	if (cookie) {
        return cookie;
	} else {
		console.log(`None found`);
	}
};

// Method to get list of products
export async function requestList(cookie, prodQuery, type) {
	console.log(`Query: ${prodQuery}`);
	console.log(`Type: ${type}`);

	// Turn to all lower case for first instance of the prodQuery
    const option = {
        host: "www.sigmaaldrich.com",
        path: `/IE/en/search/${prodQuery.toLowerCase()}?focus=products&page=1&perpage=30&sort=relevance&term=${prodQuery}&type=product_${type}`,
        headers: {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			accept_language: "en-US,en;q=0.9",
			sec_ch_ua: "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
			sec_ch_ua_mobile: "?0",
			sec_ch_ua_platform: "\"Windows\"",
			sec_fetch_dest: "document",
			sec_fetch_mode: "navigate",
			sec_fetch_site: "same-origin",
			sec_fetch_user: "?1",
			service_worker_navigation_preload: "true",
			upgrade_insecure_requests: "1",
			cookie: `${cookie}`,
			Referer: "https://www.sigmaaldrich.com/IE/en/search",
			ReferrerPolicy: "strict-origin-when-cross-origin",
        },
		method: "GET",
		body: null
    };

	// TODO: Handle correctly if no results are found
    return new Promise((resolve, reject) => {
        https.get(option, (response) => {
			console.log(response.statusCode); // Logs the HTTP status code
            
			let result = '';

            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', function () {
				const doc = result;
				// const filePath = 'searchResults.html';

				// // Write HTML content to file
				// fs.writeFile(filePath, doc, (err) => {			
				// 	if (err) {
				// 		console.error('Error writing file:', err);
				// 	} else {
				// 		console.log('HTML file saved successfully!');
				// 	}
				// });

				resolve(result);
            });
        })
    });
};

// Method to get product details
export async function requestProductDetails(uploadPath) {
	console.log(`Upload path: ${uploadPath}`);

	const options = {
		host: "www.sigmaaldrich.com",
		path: `${uploadPath}`,
		headers: {
			accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			accept_language: "en-US,en;q=0.9",
			sec_ch_ua: "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
			sec_ch_ua_mobile: "?0",
			sec_ch_ua_platform: "\"Windows\"",
			sec_fetch_dest: "document",
			sec_fetch_mode: "navigate",
			sec_fetch_site: "none",
			sec_fetch_user: "?1",
			upgrade_insecure_requests: "1"		
		},
		method: "GET",
		body: null
	};

	// TODO: Handle correctly if no results are found
	return new Promise((resolve, reject) => {
		https.get(options, (response) => {
			console.log(response.statusCode); // Logs the HTTP status code
            let result = '';

            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', function () {
				// const doc = result;
				// const filePath = 'got2.html';

				// // Write HTML content to file
				// fs.writeFile(filePath, doc, (err) => {			
				// 	if (err) {
				// 		console.error('Error writing file:', err);
				// 	} else {
				// 		console.log('HTML file saved successfully!');
				// 	}
				// });

				resolve(result);
            });
        })
	});
};