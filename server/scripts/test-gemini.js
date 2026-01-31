#!/usr/bin/env node
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Try different model names
  const modelsToTry = [
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-1.5-pro'
  ];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`\nTrying model: ${modelName}...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.1
        }
      });
      
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ SUCCESS with ${modelName}`);
      console.log(`Response: ${text.substring(0, 50)}...`);
      break;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message.substring(0, 100)}`);
    }
  }
}

testGemini();
