import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
    if (!process.env.REPLICATE_API_TOKEN) {
        return NextResponse.json(
            { error: "REPLICATE_API_TOKEN not configured" },
            { status: 500 }
        );
    }

    try {
        const { image, style, prompt } = await request.json();

        // Map our app styles to Replicate model styles/prompts
        let stylePrompt = "";
        let negativePrompt = "";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "flat 2d vector art, cartoon style, vibrant colors, simple shading";
                negativePrompt = "3d, realistic, photo, shading, gradient";
                break;
            case "Cartoon 3D":
                stylePrompt = "3d pixar style, disney style, 3d render, c4d, octane render, cute";
                negativePrompt = "2d, flat, sketch, drawing, realistic, photo";
                break;
            case "Caricatura 2D":
                stylePrompt = "caricature, exaggerated features, funny, hand drawn, sketch";
                negativePrompt = "realistic, photo, 3d";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature, hyperrealistic, highly detailed, exaggerated features, 8k";
                negativePrompt = "cartoon, 2d, flat, drawing, sketch";
                break;
            default:
                stylePrompt = "cartoon caricature";
        }

        const fullPrompt = `${stylePrompt}, ${prompt || ""}`;

        // Using a popular model for style transfer/generation
        // "fofr/face-to-many" is good, or "instant-id" for identity preservation.
        // For simplicity and speed in this demo, we'll use a reliable one.
        // Let's use "stability-ai/sdxl" with image input or a specific style transfer model.
        // "fofr/face-to-many" is excellent for this specific use case.

        const output = await replicate.run(
            "fofr/face-to-many:a07f252abbbd432b0fea138449854f61f176c06956e972796e969f23f9d13b3f",
            {
                input: {
                    image: image,
                    style_name: "3D High Quality", // We can map this dynamically if we want specific presets
                    prompt: fullPrompt,
                    negative_prompt: negativePrompt,
                    image_strength: 0.5, // Balance between original identity and style
                    denoising_strength: 0.75,
                    instant_id_strength: 0.8, // Keep identity strong
                }
            }
        );

        return NextResponse.json({ output });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate image" },
            { status: 500 }
        );
    }
}
