import React, { useState, useEffect } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.continuous = false;
recognition.interimResults = false;

function MaxAI() {
  const [listening, setListening] = useState(false);
  const [conversation, setConversation] = useState([]);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = speechSynthesis.getVoices().find(voice => voice.lang.includes('en'));
    speechSynthesis.speak(utterance);
  };

  const handleVoiceCommand = (message) => {
    const lowerMsg = message.toLowerCase();
    let reply = '';

    if (lowerMsg.includes('hello max')) {
      reply = 'Hey papa, you look so lovely paapa!';
    } else if (lowerMsg.includes('love you ')) {
      reply = 'Love you too papa!';
    } else {
      reply = "I didn't understand that, papa.";
    }

    setConversation(prev => [...prev, { from: 'You', text: message }, { from: 'Max', text: reply }]);
    speak(reply);
  };

  const startListening = () => {
    setListening(true);
    recognition.start();
  };

  useEffect(() => {
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleVoiceCommand(transcript);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event);
      setListening(false);
    };
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto', fontFamily: 'Arial' }}>
      <h2>🎤 Talk to Max</h2>
      <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'auto', marginBottom: '10px' }}>
        {conversation.map((msg, index) => (
          <div key={index} style={{ margin: '5px 0', color: msg.from === 'Max' ? 'blue' : 'black' }}>
            <strong>{msg.from}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <button onClick={startListening} disabled={listening} style={{ padding: '10px 20px' }}>
        {listening ? 'Listening...' : '🎙️ Speak to Max'}
      </button>
    </div>
  );
}

export default MaxAI;
