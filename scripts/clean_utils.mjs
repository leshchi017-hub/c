import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Helper to remove any punctuation marks
export function stripPunctuation(text) {
  if (!text) return "";
  return text
    // Replace all fullwidth & halfwidth punctuation with space
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}]/g, ' ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTaiwanNames(text) {
  if (!text) return "";
  let t = stripPunctuation(text);
  // Ensure names are preserved
  t = t
    .replace(/\bLeena\b/gi, 'Lena')
    .replace(/\bLina\b/gi, 'Lena')
    .replace(/\bAlina\b/gi, 'Lena')
    .replace(/\bRina\b/gi, 'Lena')
    .replace(/\bMew\b/gi, 'Miu')
    .replace(/\bMiew\b/gi, 'Miu')
    .replace(/莉娜/g, 'Lena')
    .replace(/米尤/g, 'Miu')
    .replace(/苗苗/g, 'Miu')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

console.log("cleanTaiwanNames test:", cleanTaiwanNames("哈囉，我是Lena！你今天好嗎？超開心的。"));
