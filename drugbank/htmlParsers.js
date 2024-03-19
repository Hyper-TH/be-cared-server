import cheerio from 'cheerio';

// Method to parse html for food interactions
export async function foodParser(html) {
    // RAW LOGIC:
    // for every tr class "success" OR "danger"
    // if "success" grab div class="pull-right" content
        // grab a tag content
        // for every td
            // grab content
    // else if "danger"
        // grab div class="pull-right" > a tag content
        // grab td content (i.e., No known food interactions)

    // Return as JSON:
    /*
    {
        name: "",
        num_interactions: "",
        interactions: {
            1: "",
            2: ""
        }
    },    
    {
        name: "",
        num_interactions: 0,
        interactions: {}
    }
    */
    const $ = cheerio.load(html);

    let results = [];
    let id = 0;

    $('.success, .danger').each(function () {
        let interactions = {};
        let name = $(this).find('a').text().trim();
        let num_interactions = $(this).find('.pull-right').text().trim();
        let index = 0;
        id += 1;

        // for every td
        // Use next() to get the following tr elements and find td in them
        let nextTr = $(this).next('tr');
        while (nextTr.length > 0 && nextTr.find('td').length > 0) {
            let interactionText = nextTr.find('td').text().trim();
            interactions[index] = interactionText;

            // Move to the next tr
            nextTr = nextTr.next('tr');
            index += 1;
        }

        results.push({
            id: id,
            name: name,
            num_interactions: num_interactions,
            interactions: interactions
        })
    });

    return results;
};

// Method to parse html for drug interactions
export async function drugParser(html) {
    // RAW LOGIC:
    // for every class="interactions-box"
    // grab "interactions-col subject"
    // grab "interactions-col affected"
    // grab "severity-badge severity-*" // severity-<actual_severity>
    // grab "interactions-col description" > p
    // grab "interactions-row" > p
    // Return as JSON:
    /*
        {
            subject: "",
            affected: "",
            severity: "",
            description: "",
            actual_description: "",
            references: {
                1: "",
                2: ""
            }
        }
    */

    const $ = cheerio.load(html);

    let results = [];
    let id = 0;

    if ($('.results').find('h2').text().trim() == 'No Interactions Found') {
        console.log(`No interactions found!`);
    } else {
        $('.interactions-box').each(function () {
        let references = {};
        id += 1;
        let subject = $(this).find('.interactions-col.subject').text().trim();
        subject = subject.split("button=")[0];
        let affected = $(this).find('.interactions-col.affected').text().trim();
        affected = affected.split("button=")[0];
        let severityClass = $(this).find('.severity-badge').attr('class');
        let severity = 
            severityClass.includes('severity-major') ? 'Major' : 
            severityClass.includes('severity-minor') ? 'Minor' : 
            severityClass.includes('severity-moderate') ? 'Moderate' : 
            '';
        
        // For descriptions not within an <a> tag, we need to filter them out
        let descriptions = $(this).find('.interactions-col.description p').filter(function() {
            return $(this).find('a').length === 0;
        }).map(function() {
            return $(this).text().trim();
        }).get().join(' '); // Joining paragraph texts with a space, you can adjust this

        // For actual_description, assuming we're getting content from every p tag in ".interactions-row"
        let actualDescriptions = $(this).find('div[class*="truncate-overflow"] p').map(function() {
            return $(this).text().trim();
        }).get().join(' '); // Joining paragraph texts with a space, you can adjust this

        // Extract references
        $(this).find('li[id^="reference-"]').each(function(index) {
            // This will ignore the text within any <a> tags directly under the <li>
            let referenceText = $(this).clone().children('a').remove().end().text().trim();
            
            // Remove surrounding square brackets from the text
            referenceText = referenceText.replace(/\[\]/g, '');

            if (referenceText) {
                references[index + 1] = referenceText;
            }

        });

        results.push({
            id: id,
            subject: subject,
            affected: affected,
            severity: severity,
            description: descriptions,
            actual_description: actualDescriptions,
            references: references
        });

        }
    )};

    return results;
};