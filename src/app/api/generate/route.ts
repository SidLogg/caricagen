import { NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";
import OpenAI from "openai";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Hybrid Free Solution) ===");

    if (!process.env.FAL_KEY) {
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
        console.log("Request received:", { style, hasImage: !!image });

        // Step 1: Analyze the image using a free vision model (if available)
        // For now, we'll create a detailed prompt based on common features

        let stylePrompt = "";
        let detailedPrompt = "";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "2d cartoon style, animated, vibrant colors, simple shapes, clean lines, vector art";
                detailedPrompt = "a person with distinctive facial features in 2d cartoon style, animated character design, bold outlines, flat colors";
                break;
            case "Cartoon 3D":
                stylePrompt = "3d pixar style, disney animation, cute character, rendered, smooth surfaces, cgi";
                detailedPrompt = "a person with recognizable features as a 3d pixar character, disney style, expressive face, rendered animation";
                break;
            case "Caricatura 2D":
                stylePrompt = "caricature drawing, exaggerated features, funny, hand drawn, sketch style, comic art";
                detailedPrompt = "a person with exaggerated distinctive facial features, caricature style, humorous, hand drawn sketch";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature, detailed, subtle exaggeration, professional art, hyperrealistic rendering";
                detailedPrompt = "a person with slightly exaggerated but realistic features, professional caricature, detailed rendering";
                break;
            default:
                stylePrompt = "cartoon style";
                detailedPrompt = "a person in cartoon style";
        }

        // Upload image to Fal.ai storage
        console.log("Uploading reference image...");
        const imageUrl = await fal.storage.upload(image);
        console.log("Image uploaded:", imageUrl);

        // Use the uploaded image as a reference with IP-Adapter
        const fullPrompt = `${detailedPrompt}, ${prompt || "high quality, masterpiece"}, professional art, detailed`;

        console.log("Generating with prompt:", fullPrompt);

        // Try using fal-ai/flux/dev with image prompt for better results
        const result: any = await fal.subscribe("fal-ai/flux/dev", {
            input: {
                prompt: fullPrompt,
                image_url: imageUrl,
                num_inference_steps: 28,
                guidance_scale: 3.5,
                num_images: 1,
                enable_safety_checker: false,
                output_format: "jpeg",
            },
            logs: true,
        });

        console.log("Generation complete");

        const outputUrl = result.images?.[0]?.url || result.image?.url;

        if (!outputUrl) {
            throw new Error("No image URL in response");
        }

        return NextResponse.json({ output: outputUrl });
    } catch (error: any) {
        console.error("=== AI Generation Error ===");
        console.error("Error details:", {
            message: error?.message,
            body: error?.body,
        });

        // If FLUX fails, fallback to fast-sdxl
        try {
            console.log("Trying fallback model...");
            const { image, style, prompt } = await request.json();

            const imageUrl = await fal.storage.upload(image);

            let simplePrompt = "";
            switch (style) {
                case "Cartoon 2D":
                    simplePrompt = "2d cartoon character, animated style";
                    break;
                case "Cartoon 3D":
                    simplePrompt = "3d pixar character, disney style";
                    break;
                case "Caricatura 2D":
                    simplePrompt = "caricature drawing, exaggerated features";
                    break;
                case "Caricatura Realista":
                    simplePrompt = "realistic caricature, detailed";
                    break;
                default:
                    simplePrompt = "cartoon character";
            }

            const fallbackResult: any = await fal.subscribe("fal-ai/fast-sdxl", {
                input: {
                    prompt: `${simplePrompt}, ${prompt || "high quality"}`,
                    image_url: imageUrl,
                    strength: 0.75,
                    num_inference_steps: 25,
                },
            });

            const outputUrl = fallbackResult.images?.[0]?.url || fallbackResult.image?.url;
            if (outputUrl) {
                return NextResponse.json({ output: outputUrl });
            }
        } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError);
        }

        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
            },
            { status: 500 }
        );
    }
}
