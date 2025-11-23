import { NextResponse } from "next/server";

export const runtime = 'edge'; // Use Edge Runtime for better performance with Cloudflare

async function runCloudflareAI(model: string, input: any) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
        throw new Error("Missing Cloudflare credentials");
    }

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
            headers: { Authorization: `Bearer ${apiToken}` },
            method: "POST",
            body: JSON.stringify(input),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare API Error: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function POST(request: Request) {
    console.log("=== API Generate Called (Cloudflare Workers AI v2) ===");

    try {
        const { image, style, prompt, exaggeration, width, height, bodyMode } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // Prepare prompts based on style
        let stylePrompt = "";
        let negativePrompt = "low quality, worst quality, blurry, out of focus, bad anatomy, deformed, disfigured, ugly, amateur, poorly drawn, messy lines, watermark, signature, text, logo, jpeg artifacts, compression, noise, grainy, pixelated, low resolution, bad proportions, asymmetric, crooked, uneven, sloppy, rushed, unprofessional";

        // CRITICAL: Keep strength LOW to preserve identity for face
        // But INCREASE for body generation to allow more creativity
        let strength = 0.45;

        // Adjust prompt based on exaggeration slider (0-100)
        // Use smooth gradual changes for consistency
        let exaggerationPrompt = "";
        const exValue = exaggeration ? Number(exaggeration) : 50; // Default 50
        
        // Calculate strength based on exaggeration level (smooth curve)
        // 0% = 0.35 (very close to original)
        // 50% = 0.45 (balanced)
        // 100% = 0.60 (maximum exaggeration)
        const baseStrength = 0.35 + (exValue / 100) * 0.25;

        if (exValue === 0) {
            exaggerationPrompt = "no exaggeration, natural proportions, realistic features, accurate representation";
            strength = 0.30; // Minimal change
        } else if (exValue < 20) {
            exaggerationPrompt = "very subtle caricature, slightly emphasized features, natural look, gentle stylization";
            strength = baseStrength;
        } else if (exValue < 40) {
            exaggerationPrompt = "mild caricature, softly exaggerated features, recognizable, pleasant stylization";
            strength = baseStrength;
        } else if (exValue < 60) {
            exaggerationPrompt = "moderate caricature, clearly exaggerated features, expressive, fun stylization";
            strength = baseStrength;
        } else if (exValue < 80) {
            exaggerationPrompt = "strong caricature, notably exaggerated features, bold stylization, humorous";
            strength = baseStrength;
        } else {
            exaggerationPrompt = "extreme caricature, highly exaggerated features, dramatic stylization, comical";
            strength = baseStrength;
        }
        
        console.log(`Exaggeration: ${exValue}% - Strength: ${strength.toFixed(2)}`);

        // BODY MODE: Use moderate strength to apply style changes
        const isBodyMode = bodyMode === true;
        if (isBodyMode) {
            // Use moderate strength to apply clothing/style changes without destroying the image
            // Note: img2img cannot ADD body parts that don't exist in the source
            strength = 0.55; // Moderate strength for style changes only
            console.log("🎨 Body mode enabled - using moderate strength:", strength);
        }

        // If user provides a detailed prompt, increase strength to allow more changes
        if (prompt && prompt.trim() && prompt.trim().length > 20) {
            strength = Math.min(strength + 0.15, 0.75);
            console.log("📝 User prompt detected - increased strength to:", strength);
        }

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = `professional 2D cartoon illustration, clean vector art style, flat cel shading, bold black outlines, vibrant solid colors, animated series quality, Disney TV animation style, simple shapes, ${exaggerationPrompt}`;
                negativePrompt += ", 3d render, realistic, photograph, sketchy, messy lines, watercolor, painterly, shading, gradient, textured";
                break;
            case "Cartoon 3D":
                stylePrompt = `high quality 3D Pixar character, Disney CGI animation style, smooth plastic shader, volumetric lighting, subsurface scattering, professional 3D render, Dreamworks quality, ${exaggerationPrompt}`;
                negativePrompt += ", 2d, flat, hand drawn, sketch, painting, anime, low poly, clay";
                break;
            case "Caricatura 2D":
                stylePrompt = `professional caricature illustration, exaggerated cartoon portrait, editorial caricature style, bold ink lines, vibrant colors, MAD Magazine quality, expressive features, ${exaggerationPrompt}`;
                negativePrompt += ", realistic, photograph, 3d, amateur, sketchy, messy";
                break;
            case "Caricatura Realista":
                stylePrompt = `hyperrealistic caricature painting, oil painting style, professional portrait art, subtle exaggeration, fine details, museum quality, classical painting technique, ${exaggerationPrompt}`;
                negativePrompt += ", cartoon, flat, 2d, anime, low quality, amateur";
                if (!isBodyMode) {
                    strength = 0.40;
                }
                break;
            default:
                stylePrompt = "professional cartoon character";
        }

        // Enhance negative prompt for body mode
        if (isBodyMode) {
            negativePrompt += ", cropped, cut off, headshot only, portrait only, bust only, shoulders only, missing body, no legs, no arms, incomplete, half body, upper body only, torso only, different face, changed face, altered face, modified head";
        }

        // Combine prompts
        const userPromptLower = prompt ? prompt.toLowerCase() : "";

        // Check for black and white request
        const isBlackAndWhite = userPromptLower.includes("preto e branco") ||
            userPromptLower.includes("black and white") ||
            userPromptLower.includes("monochrome") ||
            userPromptLower.includes("grayscale") ||
            userPromptLower.includes("escala de cinza");

        if (isBlackAndWhite) {
            // Remove conflicting style keywords
            stylePrompt = stylePrompt.replace(/vibrant, /g, "")
                .replace(/flat colors, /g, "")
                .replace(/colorful, /g, "")
                .replace(/colored, /g, "");

            stylePrompt += ", monochrome, black and white, grayscale, line art, ink drawing, no colors";
            negativePrompt += ", (color:1.6), (vibrant:1.5), (blue:1.2), (red:1.2), (green:1.2)";

            // DO NOT INCREASE STRENGTH. We rely on the input image being grayscale.
        }

        // Build final prompt with quality tags and USER PROMPT as priority
        const qualityTags = "masterpiece, best quality, professional artwork, high resolution, detailed, clean lines, perfect composition, award winning";
        
        let finalPrompt;
        if (prompt && prompt.trim()) {
            // User provided a prompt - give it MAXIMUM priority
            finalPrompt = `${qualityTags}, (${prompt.trim()}:2.0), ${stylePrompt}`;
        } else {
            // No user prompt - use style defaults
            finalPrompt = `${qualityTags}, ${stylePrompt}`;
        }

        console.log(`Generating with Style: ${style}, Strength: ${strength}`);
        console.log(`User Prompt: "${prompt || 'none'}"`);
        console.log(`Final Prompt: ${finalPrompt}`);

        // Convert Base64 image to Array of Integers
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageArray = Array.from(new Uint8Array(imageBuffer));

        // Note: Inpainting model has issues with Cloudflare, using img2img with high strength instead

        // Use img2img model for all generations
        // Inpainting model has issues with Cloudflare
        const model = "@cf/runwayml/stable-diffusion-v1-5-img2img";

        // Cloudflare SD 1.5 img2img has strict dimension requirements
        // The model works best with standard sizes, not custom dimensions
        // We'll use 512x512 and let the frontend handle aspect ratio display
        
        console.log(`Requested dimensions: ${width}x${height}`);
        console.log("Note: Using 512x512 for Cloudflare compatibility");

        // Higher guidance = follow prompt more strictly and better quality
        // Use higher guidance for better adherence to style and quality
        const guidanceScale = (prompt && prompt.trim()) ? 10.0 : 8.5;

        const input: any = {
            prompt: finalPrompt,
            image: imageArray, // Pass the image bytes
            strength: strength, // 0.0 to 1.0 (higher = more AI, less original)
            guidance: guidanceScale, // High guidance when user provides prompt
            negative_prompt: negativePrompt
            // NOT passing width/height - let the model use its default
        };

        console.log(`Guidance Scale: ${guidanceScale}`);

        if (isBodyMode) {
            console.log("🎨 Using img2img with high strength for body generation");
        }

        const outputBuffer = await runCloudflareAI(model, input);
        const outputBase64 = `data:image/png;base64,${outputBuffer.toString('base64')}`;

        console.log("Generation complete");

        return NextResponse.json({ output: outputBase64 });

    } catch (error: any) {
        console.error("Generation Error:", error);
        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Check Cloudflare credentials or try a different image."
            },
            { status: 500 }
        );
    }
}
