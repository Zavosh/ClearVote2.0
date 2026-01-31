#!/usr/bin/env node
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    const models = await genAI.listModels();
    console.log('Available models:');
    for await (const model of models) {
      console.log(`- ${model.name}`);
      console.log(`  Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
    }
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

listModels();
