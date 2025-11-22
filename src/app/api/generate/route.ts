import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Hugging Face - Truly Free) ===");

    if (!process.env.HUGGINGFACE_API_TOKEN) {
        return NextResponse.json(
            { error: "HUGGINGFACE_API_TOKEN not configured. Get a free token at https://huggingface.co/settings/tokens" },
            { status: 500 }
        );
    }

    try {
        const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
        const { image, style, prompt, strength } = await request.json();

        console.log("Request received:", { style, hasImage: !!image });

        // Extract features from the image using vision model (describe the person)
        let personDescription = "a person";

        try {
            // Try to get image description using Hugging Face's image-to-text
            const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const imageBlob = new Blob([imageBuffer]);

            const description = await hf.imageToText({
                data: imageBlob,
                model: "Salesforce/blip-image-captioning-large",
            });

            console.log("Image description:", description.generated_text);
            personDescription = description.generated_text || "a person";
        } catch (descError) {
            console.log("Could not describe image, using generic prompt");
        }

        // Map styles to specific prompts
        let stylePrompt = "";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = `${personDescription} as a 2d cartoon character, animated style, vibrant colors, simple shapes, flat design, vector art, bold outlines`;
                break;
            case "Cartoon 3D":
                stylePrompt = `${personDescription} as a 3d pixar character, disney style, cute, rendered, cgi animation, toy story style, smooth surfaces`;
                break;
            case "Caricatura 2D":
                stylePrompt = `${personDescription} as a caricature drawing, exaggerated features, funny, sketch style, hand drawn, comic art, humorous`;
                break;
            case "Caricatura Realista":
                stylePrompt = `${personDescription} as a realistic caricature, detailed, exaggerated proportions, professional art, hyperrealistic rendering`;
                break;
            default:
                stylePrompt = `${personDescription} as a cartoon character`;
        }

        const fullPrompt = `${stylePrompt}, ${prompt || "high quality, masterpiece, professional art"}`;

        console.log("Generating with prompt:", fullPrompt);

        // Use Stable Diffusion 2.1 - completely free and unlimited on Hugging Face
        const result = await hf.textToImage({
            model: "stabilityai/stable-diffusion-2-1",
            inputs: fullPrompt,
            parameters: {
                negative_prompt: "ugly, blurry, low quality, distorted, deformed, bad anatomy, photorealistic, photo, realistic photo",
                num_inference_steps: 30,
                guidance_scale: 7.5,
            }
        });

        // Convert blob to base64
        const arrayBuffer = await (result as unknown as Blob).arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        console.log("Generation complete, image size:", buffer.length);

        return NextResponse.json({ output: base64Image });
    } catch (error: any) {
        console.error("=== AI Generation Error ===");
        console.error("Error details:", {
            message: error?.message,
            status: error?.response?.status,
        });

        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Get a free Hugging Face token at https://huggingface.co/settings/tokens"
            },
            { status: 500 }
        );
    }
}
