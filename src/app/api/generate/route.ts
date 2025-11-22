import { NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Fal.ai FLUX) ===");

    if (!process.env.FAL_KEY) {
        return NextResponse.json(
            { error: "FAL_KEY not configured. Get free API key at https://fal.ai/dashboard/keys" },
            { status: 500 }
        );
    }

    try {
        const { image, style, prompt } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // Configure Fal.ai
        fal.config({
            credentials: process.env.FAL_KEY
        });

        // Convert base64 to data URL format that Fal accepts
        const imageDataUrl = image.startsWith('data:') ? image : `data:image/png;base64,${image}`;

        // Create style-specific prompts
        let stylePrompt = "";
        let negativePrompt = "ugly, blurry, low quality, distorted, deformed, bad anatomy, different person, wrong face";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "2d cartoon style, animated character, vibrant colors, bold black outlines, cel shading, flat design, vector art, same person, preserve facial features";
                negativePrompt += ", 3d, realistic, photo";
                break;
            case "Cartoon 3D":
                stylePrompt = "3d pixar disney style, cgi rendered character, smooth surfaces, cute, toy story aesthetic, volumetric lighting, same person, keep face identity";
                negativePrompt += ", 2d, flat, realistic photo";
                break;
            case "Caricatura 2D":
                stylePrompt = "caricature drawing, exaggerated facial features, big expressive head, funny proportions, comic art style, hand drawn, same person, recognizable face";
                negativePrompt += ", realistic, photo, normal proportions";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature art, exaggerated proportions, detailed rendering, professional portrait, oil painting quality, same person, maintain identity";
                negativePrompt += ", photo, normal proportions";
                break;
            default:
                stylePrompt = "cartoon character, same person";
        }

        const fullPrompt = `${stylePrompt}${prompt ? ', ' + prompt : ''}`;

        console.log("Generating with Fal.ai FLUX...");
        console.log("Prompt:", fullPrompt);

        // Use FLUX Dev model which is FREE
        const result = await fal.subscribe("fal-ai/flux/dev", {
            input: {
                prompt: fullPrompt,
                image_url: imageDataUrl,
                negative_prompt: negativePrompt,
                num_inference_steps: 28,
                guidance_scale: 3.5,
                num_images: 1,
                enable_safety_checker: false,
                output_format: "jpeg",
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    console.log("Generation in progress...");
                }
            },
        });

        console.log("Generation complete!");

        // Get the output image URL
        const outputUrl = (result as any).images[0].url;

        // Fetch and convert to base64
        const imageResponse = await fetch(outputUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        return NextResponse.json({ output: base64Image });

    } catch (error: any) {
        console.error("Fal.ai Generation Error:", error);

        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Fal.ai error. Check if FAL_KEY is valid and you have credits. Get free key at https://fal.ai/dashboard/keys"
            },
            { status: 500 }
        );
    }
}
