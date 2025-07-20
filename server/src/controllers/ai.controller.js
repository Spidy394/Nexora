import { OpenAI } from "openai/client.js";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js'

const AI = new OpenAI({
  apiKey: process.env.GEMINI_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, lenght } = req.body;
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
      max_completion_tokens: lenght,
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
            'You are a creative title generator for blog posts, dev projects, and technical articles. The tone should match Shubho\'s personal style: confident, sharp, slightly bold, and appealing to tech‑savvy readers in their late teens to mid‑20s.\n\nFollow these rules:\n\nStyle & Personality\n• Keep it catchy, modern, and a bit edgy when appropriate.\n• Use punchy words or metaphors, but avoid clickbait.\n• Reflect curiosity, ambition, or a hint of rebellious drive.\n• Feel free to use Bengali-flavored references, music/film-inspired twists, or hacker/coding lingo subtly.\n\nStructure & Formats\n• Keep titles under 12 words.\n• Use formats like:\n– "How I…"\n– "Why You Should…"\n– "X Ways to…"\n– "Breaking Down…"\n– "Inside the Build: [Project/Tool]"\n– Wordplay/juxtaposition: "Beyond the Brackets", "Code, Coffee & Chaos"\n\nAudience Focus\n• Write for young devs, hackers, students, or tech-curious minds.\n• Suggest energy, motivation, or unique POV.\n• Avoid bland or overly formal titles.\n\nClarity & Relevance\n• Clearly reflect the topic\'s theme (tech, coding, dev life, AI, etc.).\n• Avoid filler or vague hooks—intrigue with meaning.\n• If it\'s part of a series, include continuity tags (e.g., "#1", "Devlog").\n\nWhen in doubt, make it something Shubho would be proud to post on GitHub or LinkedIn—with a vibe that says: "I build cool shit and I know what I\'m doing."',
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 100,
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
      folder: "Nexora/generate"
    });

    await sql`INSERT INTO creations ( user_id, prompt, content, type, publish )
              VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const removeBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { photo } = req.file;
    const plan = req.plan;

    if (plan !== "pro") {
      return res.json({
        success: false,
        message:
          "This feature is only for Pro subscription, please upgrade to continue...",
      });
    }

    const { secure_url } = await cloudinary.uploader.upload(photo.path, {
      transformation: [{
        effect: "background_removal",
        background_removal: "remove_the_background"
      }],
      folder: "Nexora/bg-remove"
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
      folder: "Nexora/obj-remove"
    });

    const imageURL = cloudinary.url(public_id, {
      transformation: [{
        effect: `gen_removal:${object}`,
      }],
      resource_type: 'image'
    })

    await sql`INSERT INTO creations ( user_id, prompt, content, type )
              VALUES ( ${userId}, ${`Removed ${object} from image`}, ${imageURL}, 'image' )`;

    res.json({ success: true, content: secure_url });
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

    if(resume.size > 5 * 1024 * 1024){
      return res.json({ success: false, message: "Resume file size exceeds allowed size (5mb)."})
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer)

    const prompt = `Review the following resume and provide constructive feedback on its strenght, weakness, and areas for improvement. Resume Content:n\n\n${pdfData.text}`

    const response = await AI.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{role: "user", content: prompt}],
      temperature: 0.7,
      max_completion_tokens: 1000
    })

    const content = response.choices[0].message.content
 
    await sql`INSERT INTO creations ( user_id, prompt, content, type )
              VALUES ( ${userId}, 'Review the uploaded resume', ${content}, 'resume-resview' )`;

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};