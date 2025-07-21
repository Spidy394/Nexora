import { OpenAI } from "openai/client.js";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

const AI = new OpenAI({
  apiKey: process.env.GEMINI_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "pro" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue...",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content:
            'You are an expert analyst and writer. Follow these rules for every article you create:\n\nDepth & Structure\n• Open with a brief abstract (2‑3 sentences).\n• Use clear section headings (H2/H3) that reflect a logical flow: Background → Core Analysis → Implications → Conclusion.\n• Conclude with a concise takeaway paragraph.\n\nEvidence‑Based Content\n• Base every claim on reputable primary sources (peer‑reviewed journals, official statistics, leading news outlets).\n• Provide inline citations in APA style; list full references in a "Sources" section.\n• When data are limited, note uncertainties and competing viewpoints.\n\nCritical Analysis\n• Go beyond description—evaluate causes, effects, and significance.\n• Compare contrasting studies or expert opinions when relevant.\n• Quantify impacts with numbers, charts, or simple calculations where useful.\n\nClarity & Readability\n• Aim for a professional yet accessible tone (upper‑undergrad audience).\n• Prefer plain language over jargon; define technical terms on first use.\n• Keep paragraphs under ~120 words and sentences under ~25 words.\n\nIntegrity & Accuracy\n• Fact‑check dates, names, and statistics against at least two independent sources.\n• Avoid speculation unless labelled "Opinion" and supported by rationale.\n• Detect and disclose potential biases in sources.\n\nFormatting Best Practices\n• Use Markdown for headings, bullet lists, tables, and code blocks.\n• Embed data visualizations only if they add insight; provide alt‑text.\n• Never copy text verbatim longer than 90 characters; paraphrase instead.\n\nEthical & Inclusive Lens\n• Represent diverse perspectives fairly.\n• Refrain from sensationalism or loaded language.\n• Ensure accessibility: explain visuals, avoid color‑only cues.\n\nWhen unsure, research further before writing. Strive for insight, balance, and credibility in every piece.',
        },

        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: length,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id, prompt, content, type)
            VALUES (${userId}, ${prompt}, ${content}, 'article')`;

    if (plan != "pro") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "pro" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue...",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a creative blog title generator for dev projects, technical articles, and hacker-style content.\n\nYour task:\nGenerate 5 unique and catchy blog titles based on the following inputs:\n- Keyword: ${input}\n- Category: ${selectedCategory.text}\n\nFor each title, include:\n1. A bold, well-crafted title (max 12 words)\n2. Level: Beginner, Intermediate, or Advanced — based on technical depth\n3. Use Case: Choose one — Tutorial, Opinion, Project Showcase, Thought Leadership, Explainer, or Creative Use\n4. Description: A 1-line explanation of what the blog post is about\n\nInstructions:\n- Use **appropriate emojis** in the output to enhance readability, tone, and engagement — without overdoing it.\n- Apply **proper Markdown styling** to format your output cleanly and professionally.\n- Use bold for titles and labels (Level, Use Case, Description).\n- Structure your response as a clean, numbered Markdown list.\n\nStyle & Personality:\n- Be confident, slightly bold, and modern in tone\n- Use punchy words, metaphors, or subtle dev/hacker lingo\n- Avoid clickbait or bland language\n- You may include Bengali cultural, music, or film references where relevant\n- Make it feel like something a young dev (18–25) would proudly post on GitHub, Dev.to, or LinkedIn\n\nOutput Format Example (Markdown):\n\n## 1. **How I Made My Coffee with AI ☕🤖**  \n   - **Level:** Beginner  \n   - **Use Case:** Tutorial  \n   - **Description:** A fun walkthrough on automating coffee using AI tools",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 500,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations ( user_id, prompt, content, type )
              VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;

    if (plan !== "pro") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "pro") {
      return res.json({
        success: false,
        message:
          "This feature is only for Pro subscription, please upgrade to continue...",
      });
    }

    const formData = new FormData();
    formData.append("prompt", prompt);

    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formData,
      {
        headers: {
          "x-api-key": process.env.IMAGE_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    const base64Image = `data:image/png;base64,${Buffer.from(
      data,
      "binary"
    ).toString("base64")}`;

    const { secure_url } = await cloudinary.uploader.upload(base64Image, {
      folder: "Nexora/generate",
    });

    await sql`INSERT INTO creations ( user_id, prompt, content, type, publish )
              VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${
      publish ?? false
    })`;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const removeBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const photo = req.file;
    const plan = req.plan;

    if (plan !== "pro") {
      return res.json({
        success: false,
        message:
          "This feature is only for Pro subscription, please upgrade to continue...",
      });
    }

    const { secure_url } = await cloudinary.uploader.upload(photo.path, {
      transformation: [
        {
          effect: "background_removal",
          background_removal: "remove_the_background",
        },
      ],
      folder: "Nexora/bg-remove",
    });

    await sql`INSERT INTO creations ( user_id, prompt, content, type )
              VALUES ( ${userId}, 'Remove background from the image', ${secure_url}, 'image' )`;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const removeObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const photo = req.file;
    const plan = req.plan;
    const { object } = req.body;

    if (plan !== "pro") {
      return res.json({
        success: false,
        message:
          "This feature is only for Pro subscription, please upgrade to continue...",
      });
    }

    const { public_id } = await cloudinary.uploader.upload(photo.path, {
      folder: "Nexora/obj-remove",
    });

    const imageURL = cloudinary.url(public_id, {
      transformation: [
        {
          effect: `gen_remove:prompt_(${object})`,
        },
      ],
      resource_type: "image",
    });

    await sql`INSERT INTO creations ( user_id, prompt, content, type )
              VALUES ( ${userId}, ${`Removed ${object} from image`}, ${imageURL}, 'image' )`;

    res.json({ success: true, content: imageURL });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const reviewResume = async (req, res) => {
  try {
    const { userId } = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if (plan !== "pro") {
      return res.json({
        success: false,
        message:
          "This feature is only for Pro subscription, please upgrade to continue...",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "Resume file size exceeds allowed size (5mb).",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);

    const prompt = `You are a professional career coach and resume expert. When given the extracted text content of a resume, your task is to review it thoroughly and provide a detailed, constructive, and professional analysis. Your response should be structured using appropriate Markdown formatting for better readability and elegance. Include emojis where suitable to enhance clarity and engagement, but keep the tone professional.

    Your review should include the following sections:

    ⭐ Overall Score: [X/10]
    Rate the resume on a scale of 1-10 with brief justification.

    📌 Strengths
    Highlight the key strengths of the resume such as formatting, clarity, relevant skills, achievements, and alignment with industry standards.

    ⚠️ Weaknesses
    Point out any shortcomings or areas where the resume could be improved. This could include poor formatting, vague descriptions, lack of quantifiable achievements, grammar issues, or irrelevant information.

    💡 Areas for Improvement
    Offer actionable suggestions to improve the resume. This may include:

    Enhancing section headings

    Optimizing content for ATS (Applicant Tracking Systems)

    Adding metrics or impact-driven language

    Reorganizing layout for better flow

    Tailoring for a specific role or industry

    🔍 ATS Optimization Notes
    Keywords and phrases that should be included
    Formatting considerations for ATS systems
    Industry-standard terminology suggestions

    ✅ Overall Impression
    Summarize your thoughts in 2–3 lines. State whether the resume is strong, average, or needs significant improvement and whether it's ready to be sent out for applications.

    Resume Content:\n\n${pdfData.text}`;

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 1000,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations ( user_id, prompt, content, type )
              VALUES ( ${userId}, 'Review the uploaded resume', ${content}, 'resume-resview' )`;

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
