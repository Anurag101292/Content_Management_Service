
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { GoogleSheetUtility } from "./utility/GoogleSheetUtility";

export type TrendResult = {
    query: string;
    search_volume: number;
    categories: { name: string }[];
};

export async function fetchTrendingTweets(country: string = "india"): Promise<TrendResult[]> {
    // Simple slugification: e.g. "United States" -> "united-states"
    // Note: getdaytrends.com usually uses full names with hyphens. 
    // "usa" might need mapping to "united-states" but we'll try direct slug first or handle common cases.
    let slug = country.trim().toLowerCase().replace(/\s+/g, '-');

    if (slug === 'usa' || slug === 'us') {
        slug = 'united-states';
    } else if (slug === 'uk') {
        slug = 'united-kingdom';
    }

    const url = `https://getdaytrends.com/${slug}/top/tweeted/day/`;
    console.log(`Fetching trends from: ${url}`);

    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0" // important for scraping
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch page for ${country} (${url}): ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: TrendResult[] = [];

    /**
     * Each trend row usually looks like:
     * - Trending text
     * - Tweet count (e.g. "120K Tweets")
     */
    $("table tbody tr").each((_, row) => {
        const columns = $(row).find("td");

        if (columns.length < 2) return;

        const query = $(columns[0]).text().trim();

        const volumeText = $(columns[1]).text().trim();
        const search_volume = parseTweetCount(volumeText);

        if (!query || search_volume === 0) return;

        results.push({
            query,
            search_volume,
            categories: [] // category intentionally blank
        });
    });

    return results;
}

// Function to scrape and save to Sheet2 using the dedicated saveTwitterTrends method
export async function scrapeAndSave(country: string = "india") {
    try {
        console.log(`Starting scrape for ${country}...`);
        const data = await fetchTrendingTweets(country);

        console.log(`Fetched ${data.length} trends.`);

        // Read spreadsheet ID from credentials.json
        let spreadsheetId = "1DquccxLhNysfCFX28m2b9I_9UL8HiCNYfqnZ-vTaLzY"; // Default fallback
        const credentialsPath = path.join(__dirname, "credentials.json");

        try {
            if (fs.existsSync(credentialsPath)) {
                const rawData = fs.readFileSync(credentialsPath, "utf-8");
                const creds = JSON.parse(rawData);
                spreadsheetId = creds.spreadsheet_id || spreadsheetId;
            }
        } catch (e) {
            console.error("Error reading credentials.json:", e);
        }

        const sheetsHelper = new GoogleSheetUtility(
            spreadsheetId,
            credentialsPath,
            "Sheet1" // Default initialized, but saveTwitterTrends will ignore this and use Sheet2
        );

        console.log("Saving to Sheet2 via saveTwitterTrends...");
        await sheetsHelper.saveTwitterTrends(data);
        console.log("Done.");
        return data;

    } catch (error) {
        console.error("Error in scrapeAndSave:", error);
        throw error;
    }
}

/**
 * Converts:
 * "120K Tweets" -> 120000
 * "2.3M Tweets" -> 2300000
 */
function parseTweetCount(text: string): number {
    const match = text.match(/([\d.]+)\s*([KM]?)/i);
    if (!match) return 0;

    let value = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();

    if (unit === "K") value *= 1_000;
    if (unit === "M") value *= 1_000_000;

    return Math.round(value);
}
