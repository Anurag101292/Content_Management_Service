import { initChatModel } from "langchain/chat_models/universal";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";


import { fetchTrendingTweets } from "./webscrapper";
import { fetchGoogleTrends } from "./googletrendhandler";

const systemPrompt = `You are a expert assistant that can fetch the latest trends of twitter and google of Given country in 24 hours and also speak in Humour way.
                      you have access of two tools:
                      1. get_twitter_trends= Get the latest trends of twitter of Given country in 24 hours
                      2. get_google_trends= Get the latest trends of google of Given country in 24 hours
                      
                      IMPORTANT: Final response MUST be a JSON object like:
                      {
                        "humour_response": "...",
                        "trends": [{ "query": "...", "search_volume": 0 }]
                      }`;

// Keeping the schema for reference, though createReactAgent doesn't enforce it automatically without structured output mode.
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
};

function getCountryCode(countryName: string): string {
    const normalized = countryName.toLowerCase().trim();
    return COUNTRY_CODE_MAP[normalized] || countryName;
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
    // Initialize the model
    // Note: 'initChatModel' acts as a universal wrapper.
    const model = await initChatModel("llama3.2", {
        modelProvider: "ollama",
        temperature: 0.5,
        maxTokens: 1024,
    });

    // Initialize MemorySaver for persistence
    const checkpointer = new MemorySaver();

    // Create the ReAct Agent
    const agent = createAgent({
        model: new ChatOllama({ model: "llama3.2" }),
        tools: [getTwitterTrends, getGoogleTrends],
        systemPrompt,
        responseFormat,
        checkpointer
    });

    console.log("Agent is running with MemorySaver (Thread ID: 1)...");

    const config = { configurable: { thread_id: "1" } };

    const response = await agent.invoke({
        messages: [{ role: "user", content: "Hello, whats trending on twitter in india?" }],
    }, config);


    console.log("--- Full Response Object ---");
    // console.log(response); // Response from LangGraph is the state

    const response1= await agent.invoke({
        messages: [{ role: "user", content: "Hello, for which country I asked for trending twitter?" }],
    }, config);

    console.log("Anurag"+response1.messages[response1.messages.length - 1].content)

    console.log("\n--- AI Message Only ---");
    if (response1.messages && Array.isArray(response1.messages) && response1.messages.length > 0) {
        const lastMessage = response1.messages[response1.messages.length - 1];
        console.log(lastMessage.content);
    } else {
        console.log("No messages found in response.");
    }
}

main().catch(console.error);