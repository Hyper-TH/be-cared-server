import cheerio from 'cheerio';

// Method to parse html of search results
export async function productListParser(html, type) {
    const $ = cheerio.load(html);

    let results = [];
    let id = 0;

	if (type === 'number') {
		console.log(`Entered ID section..`);
		
		$('div[data-testid="srp-substance-group"]').each(function () {
			let products = [];
			let productName = $(this).find('#substance-name').text().trim();
			
			// Directly target the desired tr within tbody
			let targetRow = $('tbody[class*="MuiTableBody-root"]').find('tr').eq(0); 

			// For the targeted tr, find the second and third td
			let idTD = targetRow.find('td').eq(1); // 2nd td
			let descTD = targetRow.find('td').eq(2); // 3rd td

			// Within these tds, find the a elements
			let aElement = idTD.find('a');
			let bElement = descTD.find('a');

			// Grab the text and href from the a element
			let productID = aElement.text().trim();
			let productDescription = bElement.text().trim();
			let href = aElement.attr('href');
			id += 1;

			products.push({
				productID: productID,
				productDescription: productDescription,
				href: href
			});		

			results.push({
				id: id,
				products,
				productName
			});
		});


	} else {
		console.log(`Entered name section..`);

		$('div[data-testid="srp-substance-group"]').each(function () {
			let products = [];
			let productName = $(this).find('#substance-name').text().trim();
			
			$(this).find('tbody[class*="MuiTableBody-root"]').find('tr').each(function() {
				// For each tr, find the second td
				let idTD = $(this).find('td').eq(1);
				let descTD = $(this).find('td').eq(2);
				// Within the second td, find the a element
				let aElement = idTD.find('a');
				let bElement = descTD.find('a');

				// Grab the text and href from the a element
				let productID = aElement.text().trim();
				let productDescription = bElement.text().trim();
				let href = aElement.attr('href');
				id += 1;

				products.push({
					productID: productID,
					productDescription: productDescription,
					href: href
				});		
			});

			results.push({
				id: id,
				products,
				productName
			});
		});
	};	

	return results;
};

// Method to parse html of product details page
export async function productDetailsParser(html, uploadPath) {
	console.log(`Entered product details parser with ${uploadPath}`);
	
	const $ = cheerio.load(html);
	let product = {};
	let productDetails = {};
	let productSubDetails = {};
	let productProperties = {};
	
	let productName = $('span#product-name').text().trim();
	let productDescription = $('span#product-description').text().trim();

	// PRODUCT DETAILS
	let $productDetailsRoot = $('[class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12"]');

	// Iterate through potential child divs
	$productDetailsRoot.find('div').each(function() {
		// Get the class attribute of the current div
		const classAttr = $(this).attr('class');

		if (classAttr && classAttr.endsWith("MuiTypography-caption")) {
			console.log(`Entered main class`);

			// if the next div class ends on a classname MuiTypography-body1, then do this:
			if ($(this).next().hasClass("MuiTypography-body1")) {
				console.log(`Entered top details`);
		
				let key = $(this).text().trim();
				let value = $(this).next().text().trim();
		
				// Assuming productDetails is an object where you want to store the key-value pairs
				productDetails[key] = value;
		
				console.log(`Key: ${key}, Value: ${value}`);
			}
		} 

		// Entered Product Details container
		else if (classAttr && classAttr.endsWith('MuiGrid-container')) {
			$(this)
			.find('[class$="MuiGrid-container MuiGrid-item MuiGrid-grid-xs-12 MuiGrid-grid-sm-6 MuiGrid-grid-lg-4"]')
			.each(function () {			
  				let key = $(this).find('[class="MuiGrid-root MuiGrid-item"]').first().text().trim();

			    let value = $(this).find('[class="MuiGrid-root MuiGrid-item"]').last().text().trim();

				productSubDetails[key] = value;
			}) 				
		};
	});

	// PRODUCT PROPERTIES
	$('#pdp-properties--table').find('h3').each(function() {
		// Get the text content of the current h3 tag as the key
		let key = $(this).text();

		// Find the immediately following p tag and get its text content as the value
		let value = $(this).parent() 
							.next() 
							.find('p')
							.text()
							.trim(); 
		

		productProperties[key] = value;
	});
	
	product = {
		id: uploadPath,
		productName: productName,
		productDescription: productDescription,
		productSubDetails: productSubDetails,
		productDetails: productDetails,
		productProperties: productProperties
	};

	return product;
};	