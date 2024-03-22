import cheerio from 'cheerio';

// TODO: Make this code shorter/more efficient (can we combine them?)
// Method to parse html of search results
export async function productListParser(html, type) {
    /*
    {
		id: '',
        ProductName: '',
		linearFormula: '',
		products: [
			{
				id: 0,
				productID: '',
				productDescription: '',
				href: '',
			}
		]
    }
    */

    const $ = cheerio.load(html);

    let results = [];
	let products = [];

    let id = 0;

	if (type === 'number') {
		console.log(`Entered ID section..`);

		// TODO: Monitor the class names as they have changed
		$('.jss215').each(function () {
			let productName = $(this).find('.jss217 > h2').text().trim();
			let linearFormula = $(this).find('.jss225').find('span.jss224').text().trim();	
			linearFormula = linearFormula && linearFormula.trim() !== '' ? linearFormula : 'N/A';
			let productID = $(this).find('td[class*="jss248"] a').text().trim();
			let href = $(this).find('td[class*="jss248"] > a').attr('href');
			let productDescription = $(this).find('span.jss252').text().trim();
			id += 1;

			products.push({
				productID: productID,
				productDescription: productDescription,
				href: href
			});			
	
			results.push({
				id: id,
				productName: productName,
				linearFormula: linearFormula,
				products
			});
		});
	} else {
		$('.jss215').each(function () {
			let products = [];
			let productName = $(this).find('.jss217 > h2').text().trim();
			let linearFormula = $(this).find('.jss225').find('span.jss224').text().trim();
			linearFormula = linearFormula && linearFormula.trim() !== '' ? linearFormula : 'N/A';
			
			// for each loop for productID here and description 
			// TODO: Not going to the correct section of divs
			$(this).find('tr[class*="jss244"]').each(function () {
				let productID = $(this).find('td[class*="jss248"] a').text().trim();
				let productDescription = $(this).find('.jss252').text().trim();
				let href = $(this).find('td[class*="jss248"] > a').attr('href');

				products.push({
					productID: productID,
					productDescription: productDescription,
					href: href
				});			
	
			});

			results.push({
				id: id,
				products,
				productName,
				linearFormula: linearFormula
			});
		});
	};	

	return results;
};

// Method to parse html of product details page
export async function productDetailsParser(html, uploadPath) {
	console.log(`Entered product details parser with ${uploadPath}`);
	/*
		JSON TO RETURN:
		{
			id: uploadPath,
			ProductName: '',
			ProductDescription: '',
			productDetails: {
				// LOOP
			},
			productProperties: {
				// LOOP
			}
    	}
	*/

	const $ = cheerio.load(html);
	let product = {};
	let productDetails = {};
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

				productDetails[key] = value;
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
		productDetails: productDetails,
		productProperties: productProperties
	};

	return product;
};	