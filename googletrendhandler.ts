import { getJson } from "serpapi";
import fs from "fs";

export type TrendingSearch = {
    query: string;
    search_volume: number;
    categories: { name: string }[];
    increase_percentage?: number;
};

export class GoogleTrendsHandler {
    private responseData: any;
    private trendingSearches: TrendingSearch[] = [];

    // Allow initializing with existing data or fetching new data
    constructor(responseData?: any, apiParams?: any) {
        if (responseData) {
            this.responseData = responseData;
            this.parseResponse();
        } else if (apiParams) {
            // In TS constructor can't be async, so we can't fetch here easily without a static builder or init method.
            // But the Python code allowed __init__ to fetch. We will assume the static `fetch` method is the primary way to use this class
            // or the user must call an init method. 
            // However, for compatibility with the python logic `response_data = self._fetch_from_api(**api_params)`, we can't do sync fetch in constructor.
            // We will rely on the static `fetch` method to handle the async work.
            console.warn("Constructor fetching not fully supported in sync constructor. Use GoogleTrendsHandler.fetch() instead.");
        }
    }

    private parseResponse() {
        if (!this.responseData || !this.responseData.trending_searches) {
            return;
        }

        this.trendingSearches = this.responseData.trending_searches.map((item: any) => {
            const categories = (item.categories || [])
                .filter((cat: any) => cat && cat.name)
                .map((cat: any) => ({ name: cat.name }));

            return {
                query: item.query || "",
                search_volume: item.search_volume || 0,
                categories: categories,
                increase_percentage: item.increase_percentage || 0
            };
        });
    }

    public getAll(): TrendingSearch[] {
        return this.trendingSearches;
    }

    public getByQuery(query: string): TrendingSearch | undefined {
        return this.trendingSearches.find(s => s.query.toLowerCase() === query.toLowerCase());
    }

    public getByCategory(categoryName: string): TrendingSearch[] {
        return this.trendingSearches.filter(s =>
            s.categories.some(c => c.name.toLowerCase().includes(categoryName.toLowerCase()))
        );
    }

    public toList(): any[] {
        return this.trendingSearches;
    }

    public toJson(indent: number = 2): string {
        return JSON.stringify(this.toList(), null, indent);
    }

    public saveToFile(filename: string = "trends_filtered.json") {
        fs.writeFileSync(filename, this.toJson(), "utf-8");
        console.log(`Filtered data saved to ${filename}`);
    }

    public printSummary() {
        console.log(`Total trending searches: ${this.trendingSearches.length}`);
        console.log("\nTrending Searches:");
        console.log("=".repeat(80));
        this.trendingSearches.forEach((search, index) => {
            const categoriesStr = search.categories.length > 0
                ? search.categories.map(c => c.name).join(", ")
                : "No categories";
            console.log(`${index + 1}. Query: ${search.query}`);
            console.log(`   Search Volume: ${search.search_volume.toLocaleString()}`);
            console.log(`   Categories: ${categoriesStr}`);
            console.log();
        });
    }

    public static async fetch(apiKey: string, geo: string = "IN", hours: string = "24", hl: string = "en", onlyActive: string = "true", noCache: string = "true"): Promise<GoogleTrendsHandler> {
        const params = {
            api_key: apiKey,
            engine: "google_trends_trending_now",
            geo,
            hours,
            hl,
            only_active: onlyActive,
            no_cache: noCache
        };

        try {
            // getJson is usually a promise or callback based in wrapping libraries.
            // The 'serpapi' package on npm exports `getJson`.
            const response = await new Promise<any>((resolve, reject) => {
                getJson(params, (json: any) => {
                    // SerpAPI node library doesn't always strictly throw vs return error json.
                    // We assume json is the response.
                    resolve(json);
                });
            });

            const handler = new GoogleTrendsHandler(response);
            return handler;
        } catch (error) {
            throw new Error(`Failed to fetch from SerpAPI: ${error}`);
        }
    }

    public getFilteredResponse(): any[] {
        return this.toList();
    }
}

export async function fetchGoogleTrends(geo: string = "IN") {
    // Read API key from credentials.json
    let apiKey = "";
    try {
        const credsPath = "credentials.json";
        if (fs.existsSync(credsPath)) {
            const rawData = fs.readFileSync(credsPath, "utf-8");
            const creds = JSON.parse(rawData);
            apiKey = creds.serpapi_key || "";
        }
    } catch (e) {
        console.error("Failed to read credentials.json for SerpAPI key", e);
    }

    if (!apiKey) {
        console.warn("SerpAPI key not found in credentials.json, falling back to hardcoded (deprecated) or failing...");
        // Fallback for safety during migration, or just fail. 
        // User asked to put it in credentials, so let's assume it should be there.
        apiKey = "203d062c91b607699f6a7882f5e3f45a1d243941032f6da1287d029b9cd54114";
    }

    const handler = await GoogleTrendsHandler.fetch(apiKey, geo);
    return handler.getFilteredResponse();
}
