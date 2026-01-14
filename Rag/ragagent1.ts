import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OllamaEmbeddings, ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";



const run = async () => {
    const loader = new PDFLoader("/Users/anuragupadhyay/Documents/Content_Management_Service/testdata/ProjectDocs/Nike-Inc-2025_10K.pdf");

    const docs = await loader.load();
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const allSplits = await textSplitter.splitDocuments(docs);
    // console.log(`Split into ${allSplits.length} chunks`);
    //  console.log(allSplits[0].pageContent);

    const embeddings = new OllamaEmbeddings({
        model: "nomic-embed-text",
        // Default value
    });

    const memoryVectorStore = new MemoryVectorStore(embeddings);

    const batchSize = 10;
    for (let i = 0; i < allSplits.length; i += batchSize) {
        const batch = allSplits.slice(i, i + batchSize);
        await memoryVectorStore.addDocuments(batch);
        console.log(`Processed batch ${i} to ${i + batch.length} of ${allSplits.length}`);
    }

    const retriever = memoryVectorStore.asRetriever({
        k: 5,
        searchType: "mmr",
        searchKwargs: {
            fetchK: 20,
            lambda: 0.7,
        }
    });
    const retrievedDocuments = await retriever.invoke("When was Nike encorporated?");

    console.log(`\nRetrieved ${retrievedDocuments.length} documents.`);
    retrievedDocuments.forEach((doc, i) => {
        console.log(`\n--- Document ${i + 1} ---`);
        console.log(doc.pageContent);
    });

    // Manually add the first 3 chunks to context (introductory sections)
    const initialChunks = allSplits.slice(0, 3);
    const combinedDocs = [...initialChunks, ...retrievedDocuments];

    console.log(`\nUsing ${combinedDocs.length} documents for context (Introduction + Retrieved).`);

    // 1. Initialize the Llama 3.2 Agent (LLM)
    const llm = new ChatOllama({
        model: "llama3.2",
        temperature: 0,
    });

    // 2. Create a System Prompt to guide the response based on context
    const systemPrompt = `You are an expert research assistant. Use the provided context to answer the user's question accurately.
    If the answer is not present in the context, state that you do not know.
    
    Context:
    {context}`;

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["human", "{question}"],
    ]);

    // 3. Create the Execution Chain
    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

    // 4. Run the Agent
    const question = "When was Nike encorporated?";
    const context = combinedDocs.map(doc => doc.pageContent).join("\n\n");

    console.log(`\nQuestion: ${question}`);
    console.log("Generating answer...");

    const response = await chain.invoke({
        context: context,
        question: question
    });

    console.log("\nAgent Response:");
    console.log(response);

};

run().catch((error) => {
    console.error("Error running RAG agent:", error);
});




