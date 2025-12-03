import {Groq} from "groq-sdk"
// import {Models} from "groq-sdk/resources/models.mjs";
import {Models} from 'groq-sdk/resources/models'
// import { Connect } from "vite";

const GROQ_API = import.meta.env.VITE_AVARDHRA;

const groq = new Groq({
    apiKey: GROQ_API, 
    dangerouslyAllowBrowser: true,
});

export const requestToGroqAi = async(content) => {
    const reply = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content,
        },
        ],
        model: "llama3-8b-8192",
    });
    return reply.choices[0].message.content;
};