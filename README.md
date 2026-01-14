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

## Recent Updates (Jan 2026)

### 1. Migration to LangGraph (`@langchain/langgraph`)
The agent architecture has been upgraded from a standard LangChain agent to a **ReAct Agent** powered by **LangGraph**.
*   **Why**: LangGraph provides superior control over the agent's internal state and execution flow, making it more robust for complex reasoning tasks.
*   **Implementation**: We now use `createReactAgent` from `@langchain/langgraph/prebuilt`.

### 2. Conversation Persistence (`MemorySaver`)
We have integrated `MemorySaver` to enable **stateful conversations**.
*   **What it does**: It acts as a checkpointer that saves the conversation history.
*   **Benefit**: The agent can now remember the context of previous interactions.
*   **Usage**: We pass a configurable `thread_id` (currently set to `"1"`) when invoking the agent. This allows you to resume a specific conversation thread at any time.

### 3. Model Configuration Updates
We have switched to using `initChatModel` for more granular control over the LLM's behavior.
*   **Temperature (`0.5`)**: Set to a balanced value to allow for the requested "humorous" responses while maintaining factual accuracy for data fetching.
*   **Max Tokens (`1024`)**: Increased token limit to ensure the agent has enough capacity to return full lists of trends and detailed commentary without being cut off.
*   **Provider**: Explicitly configured for `ollama` running `llama3.2`.

## RAG Agent (Retrieval-Augmented Generation)

We have implemented a **Retrieval-Augmented Generation (RAG)** pipeline in `ragagent1.ts`. This agent is designed to digest complex documents (like PDF reports) and answer user questions with high accuracy by referencing specific sections of the text.

### How it Works (Architecture)

1.  **Document Loading**:
    *   We use `PDFLoader` to ingest the Nike 2025 10-K Report.
    *   This converts the binary PDF into raw text documents.

2.  **Text Splitting**:
    *   The text is too large to feed into an LLM all at once.
    *   We use `RecursiveCharacterTextSplitter` to break the document into smaller, manageable chunks (1000 characters with 200 character overlap). This preserves context between chunks.

3.  **Embedding Generation**:
    *   Each text chunk is converted into a **vector** (a mathematical representation of its meaning).
    *   We use **Ollama** with the **`nomic-embed-text`** model. This is a dedicated, high-performance embedding model that is significantly faster and more accurate for retrieval tasks than using a generic LLM like Llama 3.2.

4.  **Vector Store (Memory)**:
    *   We use `MemoryVectorStore` to store these vectors in RAM.
    *   This allows us to perform fast similarity searches to find text chunks that match a user's question.

5.  **Retrieval (MMR)**:
    *   We configured the retriever to use **Maximal Marginal Relevance (MMR)** instead of basic similarity.
    *   **Config**: `searchType: "mmr"`, `k: 5`, `fetchK: 20`.
    *   **Benefit**: It fetches a larger pool of relevant documents (20) and then selects the top 5 that are both *relevant* and *diverse*. This prevents the context from being flooded with redundant information.

6.  **Generation (LLM)**:
    *   Ideally, the retrieved context is passed to **Llama 3.2**.
    *   A custom **System Prompt** instructs the agent to act as a research assistant and *only* answer using the provided context.

### Memory Diagram

```mermaid
graph TD
    A[Input PDF (Nike 10-K)] -->|PDFLoader| B[Raw Text Docs]
    B -->|TextSplitter| C[Text Chunks (502 Total)]
    
    subgraph Vectorization Process
    C -->|Ollama: nomic-embed-text| D[Vector Embeddings]
    D -->|Store| E[(MemoryVectorStore)]
    end
    
    subgraph Retrieval Loop
    Q[User Question] -->|Embed Query| E
    E -->|MMR Search| R[Top 5 Diverse Contexts]
    end
    
    subgraph Generation
    R -->|Context Injection| P[System Context Prompt]
    P -->|ChatOllama: Llama 3.2| Ans[Final Answer]
    end

    style C fill:#f9f,stroke:#333
    style E fill:#ccf,stroke:#333
    style Ans fill:#bfb,stroke:#333
```

### Key Learnings & Optimizations

*   **Embedding Model Matters**: We initially tried `llama3.2` for embeddings, but it was too slow and caused timeouts. Switching to `nomic-embed-text` reduced processing time from 10+ minutes to < 60 seconds.
*   **Batch Processing**: To further prevent timeouts, we implemented a loop to process document chunks in batches of 10.
*   **Search Type**: Switching to **MMR** helps when the answer might be hidden in a less "obvious" section of the text that simple similarity search might miss.
