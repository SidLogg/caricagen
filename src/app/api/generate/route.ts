import { NextResponse } from "next/server";
import { Client } from "@gradio/client";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Hugging Face Gradio API) ===");

    try {
        const { image, style, prompt } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // Prepare the image (convert base64 to blob)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // List of Spaces to try (in order of preference)
        const spacesToTry = [
            "akhaliq/AnimeGANv2",  // Anime/cartoon style
            "Xenova/cartoonify",   // General cartoonization
            "multimodalart/face-to-sticker", // Face transformation
        ];

        let lastError = null;

        // Try each Space until one works
        for (const spaceUrl of spacesToTry) {
            try {
                console.log(`Attempting to use Space: ${spaceUrl}`);

                // Connect to the Gradio Space with HF token if available
                const clientOptions: any = {};
                if (process.env.HUGGINGFACE_API_TOKEN) {
                    clientOptions.hf_token = process.env.HUGGINGFACE_API_TOKEN;
                }

                const client = await Client.connect(spaceUrl, clientOptions);

                // Call the prediction endpoint
                // Different Spaces have different API signatures, so we try common patterns
                let result;
                try {
                    // Pattern 1: Simple image input
                    result = await client.predict("/predict", {
                        image: new Blob([imageBuffer], { type: "image/png" }),
                    });
                } catch (e) {
                    // Pattern 2: Named parameter
                    result = await client.predict(0, [
                        new Blob([imageBuffer], { type: "image/png" })
                    ]);
                }

                // Extract the output image URL from the result
                let outputUrl = "";

                if (result && result.data) {
                    const data = result.data;

                    // Try different response formats
                    if (Array.isArray(data) && data.length > 0) {
                        const firstOutput = data[0];
                        if (typeof firstOutput === 'string') {
                            outputUrl = firstOutput;
                        } else if (firstOutput && firstOutput.url) {
                            outputUrl = firstOutput.url;
                        } else if (firstOutput && firstOutput.path) {
                            // Some Spaces return a path that needs to be prefixed
                            outputUrl = `https://huggingface.co/spaces/${spaceUrl}/resolve/main/${firstOutput.path}`;
                        }
                    }
                }

                if (!outputUrl) {
                    throw new Error("No output URL in response");
                }

                console.log(`Success with Space: ${spaceUrl}`);

                // Fetch the image from the URL and convert to base64
                const imageResponse = await fetch(outputUrl);
                if (!imageResponse.ok) {
                    throw new Error("Failed to fetch generated image");
                }

                const arrayBuffer = await imageResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

                return NextResponse.json({ output: base64Image });

            } catch (error: any) {
                console.warn(`Space ${spaceUrl} failed:`, error.message);
                lastError = error;
                // Continue to next Space
            }
        }

        // If all Spaces failed, throw the last error
        throw new Error(`All Spaces failed. Last error: ${lastError?.message || 'Unknown'}`);

    } catch (error: any) {
        console.error("Generation Error:", error);
        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error.message,
                hint: "Hugging Face Spaces might be unavailable. Please ensure HUGGINGFACE_API_TOKEN is set in .env.local"
            },
            { status: 500 }
        );
    }
}
