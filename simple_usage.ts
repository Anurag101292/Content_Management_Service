import { GoogleTrendsHandler, fetchGoogleTrends } from "./googletrendhandler";
import { GoogleSheetUtility } from "./utility/GoogleSheetUtility";
import { fetchTrendingTweets } from "./webscrapper";
import path from "path";

async function main() {
    try {
        // --- Setup ---
        const spreadsheetId = "1DquccxLhNysfCFX28m2b9I_9UL8HiCNYfqnZ-vTaLzY";
        const credentialsPath = path.join(__dirname, "credentials.json");
        // apiKey is now handled inside fetchYoutubeTrends (or we could pass it if we parameterized it)

        // Initialize Sheet Utility with default to "Sheet1"
        const sheetsHelper = new GoogleSheetUtility(
            spreadsheetId,
            credentialsPath,
            "Sheet1"
        );

        // --- 1. Google Trends (Youtube Handler) -> Sheet1 ---
        console.log("--- Processing Google/Youtube Trends ---");
        console.log("Fetching from SerpAPI...");

        // Using the new helper function (defaults to "IN" if not specified)
        const googleTrendsData = await fetchGoogleTrends("IN");

        console.log(`Fetched ${googleTrendsData.length} trends from Google.`);
        console.log("Saving to Sheet1...");
        // Uses the default sheetName "Sheet1" initialized in constructor
        await sheetsHelper.saveTrendsData(googleTrendsData);
        console.log("Saved Google Trends to Sheet1.\n");


        // --- 2. Twitter Trends (WebScrapper) -> Sheet2 ---
        console.log("--- Processing Twitter Trends ---");
        console.log("Fetching from Twitter/GetDayTrends...");
        const twitterTrendsData = await fetchTrendingTweets("india");

        console.log(`Fetched ${twitterTrendsData.length} trends from Twitter.`);
        console.log("Saving to Sheet2...");
        // Uses the specific 'saveTwitterTrends' method which targets "Sheet2"
        await sheetsHelper.saveTwitterTrends(twitterTrendsData);
        console.log("Saved Twitter Trends to Sheet2.\n");

        console.log("All operations completed successfully.");

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();
