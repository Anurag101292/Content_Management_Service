//caling the llm


import { Ollama } from "@langchain/ollama";
const llm = new Ollama({
    model: "llama3.2",
    temperature: 0.3,
});




//---------------------------------------------------------------
//fomatting the prompt 
import { PromptTemplate } from "@langchain/core/prompts";

const prompt = new PromptTemplate({ inputVariables: ["topic"], template: "Explain about {topic}" });

async function runPrompt() {
    const formattedPrompt = await prompt.invoke({ topic: "LangChain" });
    console.log(formattedPrompt);

    const res = await llm.invoke(formattedPrompt);
    console.log(res);

}

// runPrompt().catch(console.error);
//---------------------------------------------------------------






