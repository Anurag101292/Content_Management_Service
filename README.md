# Trend Analysis & Reporting Agent

This project implements an intelligent LangChain agent capable of fetching real-time trending topics from **Twitter** and **Google**, and processing them for further analysis. It was designed to automate the collection of trend data from different sources and locations.

## Project Overview

The core of the project is a TypeScript-based LangChain agent (`agent1.ts`) that uses the **Llama 3.2** model (via Ollama) to understand user queries and autonomously select the appropriate tools to fetch trend data.

## key Dependencies

The project relies on the following key libraries:

*   **`langchain`**: The primary framework for building the agent, managing tools, and orchestrating the workflow.
*   **`@langchain/ollama`**: Integration package to use local LLMs (specifically Llama 3.2) as the reasoning engine for the agent.
*   **`zod`**: Used for schema validation, ensuring that the inputs passed to the agent's tools (like country names) are valid strings.
*   **`cheerio`**: A fast and flexible implementation of core jQuery designed specifically for the server. It is used in `webscrapper.ts` to parse HTML and extract trending tweet data from `getdaytrends.com`.
*   **`node-fetch`**: Used to make HTTP requests to external websites (for scraping) and APIs.
*   **`serpapi`**: The client library used to fetch Google Trends data via the SerpAPI service.
*   **`googleapis` & `google-auth-library`**: Official Google libraries used to authenticate with a Service Account and interact with the Google Sheets API for saving data.

## Tools & Functions

The agent is equipped with two custom tools, each serving a specific data source:

### 1. `get_twitter_trends`
*   **Source File**: `agent1.ts` (wraps `fetchTrendingTweets` from `webscrapper.ts`)
*   **Function**: Fetches the top trending topics on Twitter for a specified country.
*   **Mechanism**:
    *   It scrapes the website `getdaytrends.com` dynamically based on the country provided.
    *   It parses the HTML to extract the trend name and tweet volume.
*   **Reason for Use**: The official Twitter API is expensive and rate-limited. Scraping allows for cost-effective retrieval of trending topics for demonstration and analysis purposes.

### 2. `get_google_trends`
*   **Source File**: `agent1.ts` (wraps `fetchGoogleTrends` from `googletrendhandler.ts`)
*   **Function**: Retrieves the daily search trends from Google for a specific country.
*   **Mechanism**:
    *   It uses **SerpAPI** (Google Trends API) to fetch "Trending Now" data.
    *   It creates a mapping (e.g., `India` -> `IN`) to ensure the correct 2-letter country code is sent to the API.
*   **Reason for Use**: Google Trends provides high-quality intent data. SerpAPI offers a reliable, structured way to access this data programmatically without needing to manage complex scraping logic for Google's dynamic pages.

## Workflow Integration

1.  **User Query**: The user asks a question (e.g., *"What is trending on Google in India?"*).
2.  **Agent Reasoning**: The Llama 3.2 model analyzes the intent. It decides whether to use `get_twitter_trends` or `get_google_trends`.
3.  **Tool Execution**:
    *   If **Twitter** is chosen, `webscrapper.ts` is called to scrape data.
    *   If **Google** is chosen, `googletrendhandler.ts` is called via SerpAPI.
4.  **Response**: The agent returns the raw data, which is then formatted and displayed to the user.

## Code Structure

*   `agent1.ts`: The main entry point initializing the LangChain agent and defining the tools.
*   `googletrendhandler.ts`: Handles interactions with SerpAPI to get Google Trends.
*   `webscrapper.ts`: Contains the logic to scrape Twitter trends from the web.
*   `utility/GoogleSheetUtility.ts`: A utility class (used in `simple_usage.ts`) to save the fetched data into Google Sheets, handling authentication and formatting (including IST timestamp conversion).
*   `simple_usage.ts`: A standalone script demonstrating how to use the fetchers and save data to Google Sheets without the agent interface.

## Configuration Logic

In `agent1.ts`, specific configurations are passed to the `createAgent` function. Here is why they are critical:

### 1. `systemPrompt`
*   **Why we use it**: The system prompt acts as the "personality" and "instruction manual" for the AI model. It explicitly tells the agent **who it is** (a helpful assistant) and **what it can do** (fetch trends).
*   **Benefits**:
    *   **Context Setting**: It prevents the model from hallucinating capabilities it doesn't have.
    *   **Tool Awareness**: It specifically lists the available tools (`get_twitter_trends`, `get_google_trends`), reinforcing when the agent should call them. This strictly guides the Llama 3.2 model to use the provided tools instead of trying to generate fake trend data from its training memory.

### 2. `responseFormat` (Structured Output)
*   **Why we use it**: We define a Zod schema (using `z.object`) to enforce a strict shape for the agent's final answer.
*   **Benefits**:
    *   **Predictability**: Large Language Models (LLMs) output natural language by default, which can be messy. Structured output ensures the agent *always* returns machine-readable data (JSON).
    *   **Integration**: By forcing the output to have specific fields (e.g., `humour_response`, `trends` array with `query` and `search_volume`), we can easily parse the response in our code to display it in a UI, save it to a database, or log it cleanly without writing complex regex parsers to "guess" the data format.
