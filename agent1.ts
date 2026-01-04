import { createAgent } from "langchain";
import { tool } from "langchain";
import { ChatOllama } from "@langchain/ollama";
import { config, z } from "zod";

import { fetchTrendingTweets } from "./webscrapper";
import { fetchGoogleTrends } from "./googletrendhandler";

const systemPrompt = `You are a helpful assistant that can fetch the latest trends of twitter and google of Given country in 24 hours.
                      you have access of two tools:
                      1. get_twitter_trends= Get the latest trends of twitter of Given country in 24 hours
                      2. get_google_trends= Get the latest trends of google of Given country in 24 hours`;

const responseFormat = z.object({
    humour_response: z.string().describe("A humorous response to the user's query"),
    trends: z.array(z.object({
        query: z.string().describe("The query"),
        search_volume: z.number().describe("The search volume"),
    })).describe("The trends"),
});
const COUNTRY_CODE_MAP: Record<string, string> = {
    "india": "IN",
    "usa": "US",
    "united states": "US",
    "uk": "GB",
    "united kingdom": "GB",
    "algeria": "DZ",
    // Add more mappings as needed
};

function getCountryCode(countryName: string): string {
    const normalized = countryName.toLowerCase().trim();
    return COUNTRY_CODE_MAP[normalized] || countryName; // Default to input if not found (e.g., might be a valid code already)
}

const getTwitterTrends = tool(
    async ({ country }: { country: string }) => {
        try {
            const trends = await fetchTrendingTweets(country);
            return JSON.stringify(trends);
        } catch (e: any) {
            return JSON.stringify({ error: e.message || "Failed to fetch trends" });
        }
    },
    {
        name: "get_twitter_trends",
        description: "Get the latest trends of twitter of Given country in 24 hours ",
        schema: z.object({
            country: z.string().describe("The country to get trends for"),
        }),
    }
);

const getGoogleTrends = tool(
    async ({ country }: { country: string }) => {
        try {
            const countryCode = getCountryCode(country);
            // console.log(`Debug: Mapped '${country}' to '${countryCode}'`);
            const trends = await fetchGoogleTrends(countryCode);
            return JSON.stringify(trends);
        } catch (e: any) {
            return JSON.stringify({ error: e.message || "Failed to fetch trends" });
        }
    },
    {
        name: "get_google_trends",
        description: "Get the latest trends of google of Given country in 24 hours. Input should be country name (e.g. 'India', 'USA') or code.",
        schema: z.object({
            country: z.string().describe("The country to get trends for"),
        }),
    }
);

async function main() {
    const agent = createAgent({
        model: new ChatOllama({ model: "llama3.2" }),
        tools: [getTwitterTrends, getGoogleTrends],
        systemPrompt,
        responseFormat,
    });

    console.log("Agent is running...");
    const response = await agent.invoke({
        messages: [{ role: "user", content: "Hello, whats trending on google in india?" }],
    });

    console.log("--- Full Response Object ---");
    console.log(response);

    console.log("\n--- AI Message Only ---");
    if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
        const lastMessage = response.messages[response.messages.length - 1];
        console.log(lastMessage.content);
    } else {
        console.log("No messages found in response.");
    }
}

main().catch(console.error);