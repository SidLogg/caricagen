import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Hugging Face Inference API) ===");

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

        // Get description of the person for better prompts
        let personDescription = "a person";
        try {
            const description = await hf.imageToText({
                data: imageBlob,
                model: "Salesforce/blip-image-captioning-base",
            });
            personDescription = description.generated_text || "a person";
            console.log("Image described as:", personDescription);
        } catch (e) {
            console.warn("Description failed, using default");
        }

        // Map styles to prompts
        let stylePrompt = "";
        let negativePrompt = "realistic, photo, photograph, photorealistic";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = `${personDescription}, 2d cartoon style, animated, vibrant colors, simple shapes, flat design, vector art, bold outlines, cel shading`;
                break;
            case "Cartoon 3D":
                stylePrompt = `${personDescription}, 3d pixar style, disney character, cgi animation, rendered, smooth surfaces, cute, toy story style`;
                break;
            case "Caricatura 2D":
                stylePrompt = `${personDescription}, caricature drawing, exaggerated features, funny, big head, comic art, hand drawn, sketch style`;
                break;
            case "Caricatura Realista":
                stylePrompt = `${personDescription}, realistic caricature, detailed, exaggerated proportions, professional portrait, hyperrealistic rendering`;
                negativePrompt = "photo, photograph";
                break;
            default:
                stylePrompt = `${personDescription}, cartoon character`;
        }

        const fullPrompt = `${stylePrompt}, ${prompt || ""}, high quality, masterpiece, professional art`;

        console.log("Generating with prompt:", fullPrompt);

        // Use Stable Diffusion XL for high quality results
        // This model is always available on HF Inference API
        const result = await hf.textToImage({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: fullPrompt,
            parameters: {
                negative_prompt: negativePrompt,
                num_inference_steps: 30,
                guidance_scale: 7.5,
            }
        });

        // Convert blob to base64
        const arrayBuffer = await (result as unknown as Blob).arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        console.log("Generation complete");

        return NextResponse.json({ output: base64Image });

    } catch (error: any) {
        console.error("Generation Error:", error);
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
