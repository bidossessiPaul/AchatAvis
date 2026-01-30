
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function listModels() {
    try {
        console.log("Listing models...");
        // There is no list models endpoint in the public SDK typically, but let's try a simple completion with a very standard model to see if it works.
        // Actually, listing models is not always exposed.
        // Let's try 'claude-2.1' or 'claude-2.0' as a fallback just to see connectivity.
        // But better: try `claude-3-haiku-20240307`.

        const modelsToTry = [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ];

        for (const model of modelsToTry) {
            console.log(`Trying model: ${model}...`);
            try {
                await anthropic.messages.create({
                    model: model,
                    max_tokens: 10,
                    messages: [{ role: "user", content: "Hi" }]
                });
                console.log(`✅ SUCCESS: ${model} is available.`);
                return; // Stop after finding one
            } catch (e: any) {
                if (e.status === 404) {
                    console.log(`❌ ${model} not found.`);
                } else {
                    console.error(`❌ Error with ${model}:`, e.message);
                }
            }
        }

    } catch (error) {
        console.error("General error:", error);
    }
}

listModels();
