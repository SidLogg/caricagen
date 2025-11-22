import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Hugging Face Image-to-Image) ===");

    if (!process.env.HUGGINGFACE_API_TOKEN) {
        return NextResponse.json(
            { error: "HUGGINGFACE_API_TOKEN not configured in .env.local" },
            { status: 500 }
        );
    }

    try {
        const { image, style, prompt } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

        // Prepare the image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageBlob = new Blob([imageBuffer]);

        // Map styles to prompts for image-to-image transformation
        let stylePrompt = "";
        let negativePrompt = "ugly, blurry, low quality, distorted, deformed, bad anatomy";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "2d cartoon style, animated, vibrant colors, simple shapes, flat design, vector art, bold outlines, cel shading, cartoon character";
                negativePrompt += ", realistic, photo, photograph, 3d";
                break;
            case "Cartoon 3D":
                stylePrompt = "3d pixar style, disney character, cgi animation, rendered, smooth surfaces, cute, toy story style, 3d cartoon";
                negativePrompt += ", realistic, photo, photograph, 2d";
                break;
            case "Caricatura 2D":
                stylePrompt = "caricature drawing, exaggerated features, funny, big head, comic art, hand drawn, sketch style, caricature";
                negativePrompt += ", realistic, photo, photograph";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature, detailed, exaggerated proportions, professional portrait, hyperrealistic rendering, caricature art";
                negativePrompt += ", photo, photograph";
                break;
            default:
                stylePrompt = "cartoon character, animated style";
        }

        const fullPrompt = `${stylePrompt}, ${prompt || ""}, high quality, masterpiece, professional art, preserve face identity, maintain facial features`;

        console.log("Transforming image with prompt:", fullPrompt);

        // Use IMAGE-TO-IMAGE with SDXL
        // This preserves the original image structure while applying the style
        const result = await hf.imageToImage({
            model: "stabilityai/stable-diffusion-xl-refiner-1.0",
            inputs: imageBlob,
            parameters: {
                prompt: fullPrompt,
                negative_prompt: negativePrompt,
                num_inference_steps: 40,
                guidance_scale: 8.0,
                strength: 0.75, // 0.75 = strong style transfer while keeping identity
            }
        });

        // Convert blob to base64
        const arrayBuffer = await (result as unknown as Blob).arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        console.log("Image transformation complete");

        return NextResponse.json({ output: base64Image });

    } catch (error: any) {
        console.error("Generation Error:", error);

        // If SDXL Refiner fails, try with base SDXL
        if (error.message?.includes("refiner")) {
            try {
                console.log("Retrying with base SDXL model...");

                const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
                const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const imageBlob = new Blob([imageBuffer]);

                let stylePrompt = "";
                switch (style) {
                    case "Cartoon 2D":
                        stylePrompt = "2d cartoon style, animated, vibrant colors, cartoon character";
                        break;
                    case "Cartoon 3D":
                        stylePrompt = "3d pixar style, disney character, 3d cartoon";
                        break;
                    case "Caricatura 2D":
                        stylePrompt = "caricature drawing, exaggerated features, caricature";
                        break;
                    case "Caricatura Realista":
                        stylePrompt = "realistic caricature, exaggerated proportions, caricature art";
                        break;
                    default:
                        stylePrompt = "cartoon character";
                }

                const result = await hf.imageToImage({
                    model: "stabilityai/stable-diffusion-xl-base-1.0",
                    inputs: imageBlob,
                    parameters: {
                        prompt: `${stylePrompt}, preserve face identity, maintain facial features`,
                        negative_prompt: "ugly, blurry, low quality",
                        strength: 0.7,
                    }
                });

                const arrayBuffer = await (result as unknown as Blob).arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

                return NextResponse.json({ output: base64Image });

            } catch (retryError: any) {
                return NextResponse.json(
                    {
                        error: "Failed to generate image",
                        details: retryError?.message || "Unknown error",
                        hint: "Hugging Face API might be temporarily unavailable"
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Ensure HUGGINGFACE_API_TOKEN is valid and has access to inference API"
            },
            { status: 500 }
        );
    }
}
