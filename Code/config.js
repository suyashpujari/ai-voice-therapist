// This file contains the configuration for the extension
const CONFIG = {
  // Replace this with your actual Groq API key
  GROQ_API_KEY: "Your_API_Key",
  
  // Replace this with your actual ElevenLabs API key
  ELEVENLABS_API_KEY: "Your_API_Key",
  
  // Choose a voice ID from ElevenLabs (popular therapeutic voices):
  // Bella (warm, empathetic female): "EXAVITQu4vr4xnSDxMaL"
  // Rachel (calm, professional): "21m00Tcm4TlvDq8ikWAM" 
  // Drew (gentle male): "29vD33N1CtxCmqQRPOHJ"
  ELEVENLABS_VOICE_ID: "TRnaQb7q41oL7sV0w6Bu", // Default: Bella
  
  // AI model configuration
  MODEL: "llama-3.3-70b-versatile",
  TEMPERATURE: 0.5,
  MAX_TOKENS: 300
};