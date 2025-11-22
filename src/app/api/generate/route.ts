import { NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Fal.ai) ===");
    console.log("ENV Check:", {
        hasToken: !!process.env.FAL_KEY,
        tokenPrefix: process.env.FAL_KEY?.substring(0, 10)
    });

    if (!process.env.FAL_KEY) {
        console.error("FAL_KEY is not set");
        return NextResponse.json(
            { error: "FAL_KEY not configured. Get a free key at https://fal.ai/dashboard/keys" },
            { status: 500 }
        );
    }

    try {
        fal.config({
            credentials: process.env.FAL_KEY
        });

        const { image, style, prompt, strength } = await request.json();
        console.log("Request received:", { style, hasImage: !!image, strength });

        // Upload the base64 image to Fal.ai storage first
        console.log("Uploading image to Fal.ai storage...");
        const imageUrl = await fal.storage.upload(image);
        console.log("Image uploaded to:", imageUrl);

        // Map styles to specific prompts
        let stylePrompt = "";
        let modelToUse = "fal-ai/flux-lora"; // Using FLUX with LoRA for better face preservation

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "in the style of a 2d cartoon character, animated, vibrant colors, simple shapes, flat design";
                break;
            case "Cartoon 3D":
                stylePrompt = "in the style of a 3d pixar character, disney animation, cute, rendered, cgi";
                break;
            case "Caricatura 2D":
                stylePrompt = "in the style of a caricature drawing, exaggerated features, funny, sketch, hand drawn";
                break;
            case "Caricatura Realista":
                stylePrompt = "in the style of a realistic caricature, detailed, exaggerated proportions, professional art";
                break;
            default:
                stylePrompt = "in the style of a cartoon";
        }

        // Create a prompt that describes transforming THIS SPECIFIC person
        const fullPrompt = `A portrait of this person ${stylePrompt}, same face, same person, ${prompt || "high quality"}`;

        console.log("Calling Fal.ai with prompt:", fullPrompt);
        console.log("Using model:", modelToUse);

        // Using FLUX with image prompt for better identity preservation
        const result: any = await fal.subscribe(modelToUse, {
            input: {
                prompt: fullPrompt,
                image_url: imageUrl,
                num_inference_steps: 28,
                guidance_scale: 3.5,
                num_images: 1,
                enable_safety_checker: false,
            },
            logs: true,
        });

        console.log("Fal.ai response:", JSON.stringify(result, null, 2));

        const outputUrl = result.images?.[0]?.url || result.image?.url;

        if (!outputUrl) {
            console.error("No image URL found in result:", result);
            throw new Error("No image URL in response");
        }

        console.log("Generated image URL:", outputUrl);

        return NextResponse.json({ output: outputUrl });
    } catch (error: any) {
        console.error("=== AI Generation Error ===");
        console.error("Error details:", {
            message: error?.message,
            body: error?.body,
            stack: error?.stack
        });

        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Get a free Fal.ai key at https://fal.ai/dashboard/keys"
            },
            { status: 500 }
        );
    }
}
