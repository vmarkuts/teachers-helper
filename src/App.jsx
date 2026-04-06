import React, { useState, useEffect } from 'react';
import { AlertTriangle, Activity, Eye, Users, ChevronLeft, Send, Save, CheckCircle, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { concerns, observationsByConcern } from './data/mockConcerns';

// --- Configuration ---
// Prototype Expiry Date: Set to ~1 month from deployment.
const PROTOTYPE_EXPIRY_DATE = new Date('2026-05-01T00:00:00Z');

const ICONS = {
  AlertTriangle: <AlertTriangle size={32} className="concern-icon" />,
  Activity: <Activity size={32} className="concern-icon" />,
  Eye: <Eye size={32} className="concern-icon" />,
  Users: <Users size={32} className="concern-icon" />
};

const fallbackStrategies = {
  behaviour: "### 1. Clear Expectations\nEnsure rules are visibly posted and state what *to do* rather than what not to do.\n\n### 2. Positive Reinforcement\nCatch the student being good. Praise specific behaviors immediately.\n\n### 3. De-escalation Space\nOffer a quiet corner with low sensory input where the student can self-regulate.\n\n**Empathetic Script:**\n*\"I can see you're feeling really frustrated right now. Let's take a deep breath together. When you're ready, we can figure this out.\"*",
  anxiety: "### 1. Predictability\nProvide a clear visual schedule of the day. Warn the student 5 minutes before transitions.\n\n### 2. Chunking Tasks\nBreak large assignments into very small, manageable steps.\n\n### 3. Safe Person/Place\nIdentify a trusted adult or a safe spot the student can go to when they feel anxious.\n\n**Empathetic Script:**\n*\"It looks like things feel really big right now. You are safe here. We can just sit for a minute, there's no rush.\"*",
  attention: "### 1. Strategic Seating\nPlace the student near the point of instruction and away from high-traffic areas.\n\n### 2. Movement Breaks\nSchedule regular, purposeful movement every 15-20 minutes.\n\n### 3. Visual Timers\nUse a visual transition timer so the student can visibly see how much time is left.\n\n**Empathetic Script:**\n*\"I know it's hard to stay focused on this one. Let's work for 5 more minutes, and then we'll take a stretch break.\"*",
  social: "### 1. Explicit Modeling\nRole-play specific social scenarios when the student is calm.\n\n### 2. Structured Grouping\nCarefully select peers for group work who are empathetic and can model positive interactions.\n\n### 3. Cool-down Protocols\nTeach the student a specific signal they can use to step away from a peer conflict.\n\n**Empathetic Script:**\n*\"It can be tricky when friends don't want to play the same game. Let's practice what you could say to them next time.\"*"
};

export default function App() {
  const [apiKey] = useState(import.meta.env.VITE_OPENROUTER_API_KEY || '');
  const [view, setView] = useState('SELECT_CONCERN'); // SELECT_CONCERN, INPUT_OBSERVATION, LOADING, RESULTS, EXPIRED
  
  // App Data
  const [selectedConcernArea, setSelectedConcernArea] = useState(null);
  const [selectedObservations, setSelectedObservations] = useState([]);
  const [customNotes, setCustomNotes] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    // 1. Protection: Check Expiry
    if (new Date() > PROTOTYPE_EXPIRY_DATE) {
      setView('EXPIRED');
    }
  }, []);

  const handleSelectConcern = (concernId) => {
    setSelectedConcernArea(concernId);
    setSelectedObservations([]);
    setCustomNotes('');
    setView('INPUT_OBSERVATION');
  };

  const toggleObservation = (obsText) => {
    if (selectedObservations.includes(obsText)) {
      setSelectedObservations(selectedObservations.filter(o => o !== obsText));
    } else {
      setSelectedObservations([...selectedObservations, obsText]);
    }
  };

  const generateStrategies = async () => {
    if (selectedObservations.length === 0 && !customNotes.trim()) {
      alert("Please select or enter at least one observation.");
      return;
    }

    setView('LOADING');
    setErrorText('');
    setIsSaved(false);

    let promptText = `You are an expert Educational Psychologist. A teacher is observing a student with concerns related to "${concernLabel}".\n\n`;
    promptText += `Observed behaviors:\n`;
    selectedObservations.forEach(obs => { promptText += `- ${obs}\n`; });
    if (customNotes) {
      promptText += `- Teacher's additional notes: ${customNotes}\n`;
    }
    
    promptText += `\nPlease provide:\n1. 3 practical, immediately actionable strategies for the classroom.\n2. A short, empathetic script (what to say).\n\nCRITICAL: Output ONLY the requested strategies and script. Do NOT include any introductory or concluding text (e.g., skip "Okay, here's..."). Format using clean markdown (Bold for emphasis, Headers for sections, and Bullet points).`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': window.location.href, // Recommended by OpenRouter
          'X-Title': 'Teacher Support MVP'      // Recommended by OpenRouter
        },
        body: JSON.stringify({
          model: 'google/gemma-3-12b-it:free', // Reverted back to the stable Gemma model for faster generation
          messages: [{ role: 'user', content: promptText }],
          temperature: 0.7,
          max_tokens: 400
        })
      });

      const data = await response.json();
      
      if (data.error) {
        let errorMsg = data.error.message || "API Error";
        if (data.error.code === 429 || (data.error.metadata && data.error.metadata.raw && data.error.metadata.raw.includes("rate-limited"))) {
            errorMsg = "The AI server is currently overloaded due to high traffic. Please wait 10 seconds and try generating again.";
        }
        throw new Error(errorMsg);
      }

      setAiResult(data.choices[0].message.content);
      setView('RESULTS');
    } catch (err) {
      console.error("API Error, using fallback:", err);
      const fallbackText = fallbackStrategies[selectedConcernArea] || fallbackStrategies.behaviour;
      const disclaimer = "\n\n> ⚠️ *Note: Our AI server is currently overloaded. We've provided these proven, standard baseline strategies instead so you can still support the student immediately.*";
      setAiResult(fallbackText + disclaimer);
      setView('RESULTS');
    }
  };

  const handleSaveResult = () => {
    // Generate text content for download
    const dateStr = new Date().toISOString().split('T')[0];
    const concernLabel = concerns.find(c => c.id === selectedConcernArea)?.label || 'Concern';
    
    let content = `--- EDUCATOR SUPPORT NOTE ---\nDate: ${dateStr}\nPrimary Concern: ${concernLabel}\n\n`;
    content += `OBSERVATIONS:\n`;
    selectedObservations.forEach(o => content += `- ${o}\n`);
    if (customNotes) content += `\nADDITIONAL CONTEXT:\n${customNotes}\n`;
    content += `\n---------------------------------------\n\nRECOMMENDED STRATEGIES:\n\n${aiResult}`;

    // Trigger download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pupil_Note_${concernLabel.replace(/\s+/g, '_')}_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsSaved(true);
  };

  if (view === 'EXPIRED') {
    return (
      <div className="app-container">
        <div className="card expired-card">
          <ShieldAlert className="expired-icon" />
          <h2 className="header-title">Prototype Expired</h2>
          <p className="header-subtitle">
            The evaluation period for this prototype has ended. Please contact the developer for the production release.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="prototype-watermark">
        PROTOTYPE VERSION - NOT FOR PRODUCTION
      </div>



      {view === 'SELECT_CONCERN' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 className="header-title">What is your primary concern?</h2>
            <p className="header-subtitle">Select an area to get tailored strategies.</p>
          </div>
          
          <div className="concern-grid">
            {concerns.map(concern => (
              <div 
                key={concern.id} 
                className="concern-item"
                onClick={() => handleSelectConcern(concern.id)}
              >
                {ICONS[concern.icon]}
                <span className="concern-label">{concern.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'INPUT_OBSERVATION' && (
        <>
          <button className="btn btn-secondary" style={{ width: 'auto', marginBottom: '16px' }} onClick={() => setView('SELECT_CONCERN')}>
            <ChevronLeft size={18} /> Back
          </button>

          <div className="card">
            <h2 className="header-title" style={{ textAlign: 'left', fontSize: '20px' }}>What are you observing?</h2>
            <p className="header-subtitle" style={{ textAlign: 'left', marginBottom: '16px' }}>Select all that apply for {concerns.find(c => c.id === selectedConcernArea)?.label}.</p>
            
            {errorText && (
              <div style={{ padding: '12px', backgroundColor: '#FEF2F2', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                {errorText}
              </div>
            )}

            <div className="checkbox-list">
              {observationsByConcern[selectedConcernArea]?.map((obs, idx) => {
                const checked = selectedObservations.includes(obs);
                return (
                  <div key={idx} className={`checkbox-item ${checked ? 'checked' : ''}`} onClick={() => toggleObservation(obs)}>
                    <input 
                      type="checkbox" 
                      className="checkbox-input"
                      checked={checked}
                      readOnly
                    />
                    <span className="checkbox-label">{obs}</span>
                  </div>
                );
              })}
            </div>

            <div className="form-group">
              <label className="form-label">Additional Context (Optional)</label>
              <textarea 
                className="input-field" 
                placeholder="E.g., It usually happens after recess..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" onClick={generateStrategies}>
              Generate Strategies <Send size={18} />
            </button>
          </div>
        </>
      )}

      {view === 'LOADING' && (
        <div className="loader-container">
          <div className="spinner"></div>
          <p style={{ fontWeight: '500' }}>Analyzing observations and generating strategies...</p>
        </div>
      )}

      {view === 'RESULTS' && (
        <>
          <button className="btn btn-secondary" style={{ width: 'auto', marginBottom: '16px' }} onClick={() => setView('INPUT_OBSERVATION')}>
            <ChevronLeft size={18} /> Back to Edit
          </button>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h2 className="header-title" style={{ textAlign: 'left', fontSize: '20px' }}>Recommended Strategies</h2>
            
            <div className="result-content">
              <ReactMarkdown>{aiResult}</ReactMarkdown>
            </div>

            <button 
              className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'}`} 
              onClick={handleSaveResult}
              disabled={isSaved}
            >
              {isSaved ? <><CheckCircle size={18} /> Downloaded</> : <><Save size={18} /> Download as .TXT</>}
            </button>
          </div>
          
          <button className="btn btn-secondary" onClick={() => setView('SELECT_CONCERN')}>
            Start a New Observation
          </button>
        </>
      )}
    </div>
  );
}
