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

        // Map styles to Hugging Face Space endpoints
        let spaceUrl = "";
        let styleParam = "";

        switch (style) {
            case "Cartoon 2D":
            case "Cartoon 3D":
                // Use Cartoonify Space - excellent for cartoon transformations
                spaceUrl = "catacolabs/cartoonify";
                styleParam = "cartoon";
                break;
            case "Caricatura 2D":
            case "Caricatura Realista":
                // Use VToonify for caricature-style transformations
                spaceUrl = "PKUWilliamYang/VToonify";
                styleParam = "caricature";
                break;
            default:
                spaceUrl = "catacolabs/cartoonify";
                styleParam = "cartoon";
        }

        console.log(`Using Hugging Face Space: ${spaceUrl}`);

        // Connect to the Gradio Space
        const client = await Client.connect(spaceUrl);

        // Call the prediction endpoint
        // Most Gradio Spaces accept a file input and return an image
        const result = await client.predict("/predict", {
            image: new Blob([imageBuffer], { type: "image/png" }),
        });

        // Extract the output image URL from the result
        let outputUrl = "";

        if (result && result.data && Array.isArray(result.data)) {
            // Gradio typically returns [{"url": "..."}] or similar
            const firstOutput = result.data[0];
            if (typeof firstOutput === 'string') {
                outputUrl = firstOutput;
            } else if (firstOutput && firstOutput.url) {
                outputUrl = firstOutput.url;
            }
        }

        if (!outputUrl) {
            throw new Error("No output URL received from Hugging Face Space");
        }

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
        console.error("Generation Error:", error);
        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error.message,
                hint: "Hugging Face Space might be unavailable or rate-limited. Please try again."
            },
            { status: 500 }
        );
    }
}
