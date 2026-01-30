
import { aiService } from '../src/services/aiService';
import dotenv from 'dotenv';
import path from 'path';

// Load env from the root of backend
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testClaude() {
    console.log("🚀 Testing Claude Integration...");
    console.log("API Key loaded:", process.env.ANTHROPIC_API_KEY ? "YES (Starts with " + process.env.ANTHROPIC_API_KEY.substring(0, 10) + "...)" : "NO");

    try {
        console.log("\n1️⃣ Testing generateNearbyCities...");
        const cities = await aiService.generateNearbyCities("Paris", 3);
        console.log("Cities result:", cities);
        if (cities.length === 0) throw new Error("Cities generation returned empty list");

        console.log("\n2️⃣ Testing generateReviewResponse...");
        const response = await aiService.generateReviewResponse("Super boulot, très pro !", "Jean Test");
        console.log("Response result:", response);
        if (!response) throw new Error("Review response generation returned empty");

        console.log("\n3️⃣ Testing generateReviews...");
        const reviews = await aiService.generateReviews({
            companyName: "Plombier Express",
            trade: "Plombier",
            quantity: 2,
            zones: "Paris 15"
        });
        console.log("Reviews result:", JSON.stringify(reviews, null, 2));
        if (!reviews || reviews.length !== 2) throw new Error("Reviews generation failed or wrong count");

        console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY! Claude is working.");
        process.exit(0);
    } catch (error: any) {
        console.error("\n❌ TEST FAILED:", error);
        process.exit(1);
    }
}

testClaude();
