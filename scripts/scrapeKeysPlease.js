import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function scrapeKeysPlease() {
  console.log("Starting KeysPlease Ventures scraper for 36 Rent properties...");
  
  // Launch in headed mode to avoid basic bot protections
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Array to hold the extracted listings
  const allListings = [];
  
  try {
    console.log("Navigating to Housing.com KeysPlease Ventures profile...");
    // Direct link to KeysPlease Ventures results (you may need to adjust this if Housing.com routing changes)
    await page.goto('https://housing.com/in/buy/results?q=KeysPlease%20Ventures');
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    console.log("Please select the 'Rent (36)' tab manually if it doesn't auto-select. Waiting 10 seconds...");
    await page.waitForTimeout(10000);

    // Get all listing URLs across pages
    let propertyUrls = [];
    let hasNextPage = true;
    let pageNum = 1;

    while (hasNextPage && propertyUrls.length < 36) {
      console.log(`Extracting URLs from Page ${pageNum}...`);
      await page.waitForTimeout(2000); // Let listings load
      
      const urlsOnPage = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/rent/"]'));
        return links.map(a => a.href).filter(href => href.includes('rent'));
      });
      
      const uniqueUrls = [...new Set(urlsOnPage)];
      propertyUrls.push(...uniqueUrls);
      console.log(`Found ${uniqueUrls.length} unique URLs on this page. Total so far: ${propertyUrls.length}`);

      // Try to click Next Page
      const nextBtn = await page.$('.pagination-next'); // This selector might need adjustment
      if (nextBtn && propertyUrls.length < 36) {
        console.log("Clicking Next Page...");
        await nextBtn.click();
        pageNum++;
        await page.waitForTimeout(3000);
      } else {
        hasNextPage = false;
      }
    }

    // De-duplicate URLs
    propertyUrls = [...new Set(propertyUrls)];
    console.log(`\nFound a total of ${propertyUrls.length} property URLs to scrape.`);

    // Visit each URL to get full data
    for (let i = 0; i < propertyUrls.length; i++) {
      const url = propertyUrls[i];
      console.log(`\n[${i+1}/${propertyUrls.length}] Scraping property: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000); // wait for __NEXT_DATA__
        
        // Extract data from __NEXT_DATA__ JSON script tag
        const listingData = await page.evaluate(() => {
          const script = document.getElementById('__NEXT_DATA__');
          if (!script) return null;
          try {
            const data = JSON.parse(script.textContent);
            // Housing.com stores property details deeply nested in initialProps
            // We do a rough extraction here, or you can extract from DOM
            return data;
          } catch (e) {
            return null;
          }
        });

        // DOM Fallback extraction if __NEXT_DATA__ is too complex to parse cleanly
        const domData = await page.evaluate(() => {
          const title = document.querySelector('h1')?.innerText || '';
          const price = document.querySelector('.price')?.innerText || '';
          const address = document.querySelector('.address')?.innerText || '';
          const desc = document.querySelector('.description')?.innerText || '';
          
          const images = Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src.includes('housing-images'));
          const videos = Array.from(document.querySelectorAll('video')).map(v => v.src);
          
          return { title, price, address, description: desc, images, videos };
        });

        if (domData.title) {
           allListings.push({
             ...domData,
             sourceUrl: url,
             brokerName: "KeysPlease Ventures"
           });
           console.log(`Successfully extracted: ${domData.title}`);
        }

      } catch (err) {
        console.log(`Failed to scrape ${url}: ${err.message}`);
      }
    }

    // Save to JSON
    const outputPath = path.join(process.cwd(), 'src', 'data', 'KeysPlease_All_Listings.json');
    fs.writeFileSync(outputPath, JSON.stringify(allListings, null, 2));
    console.log(`\nSuccess! Saved ${allListings.length} listings to ${outputPath}`);
    
    console.log("\nYou can now go to the Admin Dashboard > Broker Bulk Import, type 'KeysPlease Ventures', and upload this JSON file!");

  } catch (err) {
    console.error("Scraper Error:", err);
  } finally {
    await browser.close();
  }
}

scrapeKeysPlease();
