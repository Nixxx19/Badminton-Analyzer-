import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  // Gemini API configuration
  const GEMINI_API_KEY = "Fill API Key";
  const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  // Supported video formats
  const ALLOWED_EXTENSIONS = ["mp4", "mov", "avi"];

  // Prompt for badminton analysis
  const PROMPT = `
You are a professional badminton coach and computer vision expert. Your task is to analyze an uploaded video and determine whether it shows a valid badminton activity involving visible rallies or drills with clear shuttle movement between players. If not, respond with:

"Please upload a valid badminton video showing visible rallies or drills."

If the video is valid, perform a detailed shot-by-shot, frame-level analysis. Format your response with bold headings and bullet points for each detail. For each shot, extract and return the following structured insights:

**Player Identity:**
• Player 1 (near side) or Player 2 (far side)

**Shot Type:**
• smash, clear, drop, net shot, drive, lift, push, block

**Trajectory Classification:**
• Defensive Clear, Attacking Clear, Drive, Smash, Drop, Net-Drop

**Technique Zone:**
• Forehand – overhead, Backhand – underarm

**Estimated Shuttle Speed:**
• [speed] km/h

**Contact Point on Racket:**
• sweet spot, frame, off-center, top of strings

**Player Posture at Contact:**
• ready stance, crouch, jump smash posture, off-balance

**Balance or Recovery Status:**
• recovered well, off-balance, slow recovery

**Shot Quality:**
• tight to net, deceptive, weak, attacking clear

**Improvement Suggestions:**
• [specific coaching feedback]

Repeat this analysis for every shot sequentially in the rally or drill.

At the end of the video, provide a summary for each player, including:
**Tactical Patterns:**
• overuse of clears, avoidance of backhand

**Shot Selection Tendencies:**
• variety and patterns

**Strengths and Weaknesses:**
• footwork, posture, and recovery

**Final Coaching Suggestions:**
• specific improvements for gameplay, positioning, and decision-making

Format your response with bold headings (**Heading:**) and bullet points (•) for each detail. Use this format for all shots and summaries.
  `;

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file has a name
    if (!file.name) {
      setError("❌ Invalid file. Please select a valid video file.");
      return;
    }

    // Check file extension
    const fileNameParts = file.name.split(".");
    if (fileNameParts.length < 2) {
      setError("❌ File must have an extension. Please upload MP4, MOV, or AVI video.");
      return;
    }

    const fileExt = fileNameParts[fileNameParts.length - 1].toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      setError("❌ Unsupported file format. Please upload MP4, MOV, or AVI video.");
      return;
    }

    // Check file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setError("❌ File too large. Please upload a video under 20MB.");
      return;
    }

    setUploadedFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setError(null);
    setAnalysisResult(null);
  };

  const analyzeVideo = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Convert video to base64
      const base64Video = await fileToBase64(uploadedFile);
      
      // Get file extension safely
      const fileNameParts = uploadedFile.name.split(".");
      const fileExt = fileNameParts.length >= 2 ? fileNameParts[fileNameParts.length - 1].toLowerCase() : 'mp4';
      
      // Prepare the request payload
      const payload = {
        contents: [
          {
            parts: [
              {
                text: PROMPT
              },
              {
                inline_data: {
                  mime_type: `video/${fileExt}`,
                  data: base64Video.split(',')[1] // Remove data URL prefix
                }
              }
            ]
          }
        ]
      };

      // Make API call to Gemini
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.candidates && response.data.candidates[0].content) {
        setAnalysisResult(response.data.candidates[0].content.parts[0].text);
      } else {
        setError("❌ No analysis result received from the API.");
      }

    } catch (err) {
      console.error('Analysis error:', err);
      setError(`❌ Error during analysis: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="App">
      <div className="container">
        <h1>🏸 Badminton Video Analyzer</h1>
        <p className="subtitle">
          Upload a badminton video to begin coaching analysis. (Short clips under ~20MB recommended.)
        </p>

        <div className="upload-section">
          <input
            type="file"
            accept=".mp4,.mov,.avi"
            onChange={handleFileUpload}
            className="file-input"
            id="video-upload"
          />
          <label htmlFor="video-upload" className="file-input-label">
            🎥 Upload a short badminton video
          </label>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {uploadedFile && (
          <div className="video-section">
            <div className="success-message">
              ✅ Video uploaded: {uploadedFile.name}
            </div>
            
            <video 
              controls 
              className="video-player"
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>

            <button
              onClick={analyzeVideo}
              disabled={isAnalyzing}
              className="analyze-button"
            >
              {isAnalyzing ? '🔍 Analyzing video...' : '🔍 Analyze Video'}
            </button>
          </div>
        )}

        {isAnalyzing && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Analyzing your badminton video...</p>
          </div>
        )}

        {analysisResult && (
          <div className="analysis-section">
            <h2>📝 Analysis Results</h2>
            <div className="analysis-content">
              <ReactMarkdown>{analysisResult}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
