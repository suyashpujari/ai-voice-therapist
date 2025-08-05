document.addEventListener('DOMContentLoaded', function () {
  const askButton = document.getElementById('askButton');
  const testMicButton = document.getElementById('testMicButton');
  const statusCircle = document.getElementById('statusCircle');
  const statusText = document.getElementById('statusText');
  const transcript = document.getElementById('transcript');
  const clearButton = document.getElementById('clearButton');

  let recognition = null;
  let isListening = false;
  let micPermissionGranted = false;
  let isSpeaking = false;
  let currentAudio = null;

  displayMessage('Welcome to Voice Therapist! Click "Ask" and speak about what\'s bothering you.', 'system');

  testMicButton.addEventListener('click', function () {
    clearMicrophoneMessages();
    displayMessage('Requesting microphone access...', 'system');
    requestMicrophonePermission()
      .then(() => {
        micPermissionGranted = true;
        displayMessage('Microphone access granted!', 'system');
      })
      .catch(error => {
        console.error('Microphone access error:', error);
        displayMessage('Error: Microphone access denied.', 'system');
      });
  });

  function requestMicrophonePermission() {
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
  }

  function clearMicrophoneMessages() {
    const messages = transcript.querySelectorAll('.system-message');
    messages.forEach(msg => {
      if (msg.textContent.toLowerCase().includes('microphone')) {
        msg.remove();
      }
    });
  }

  function initializeSpeechRecognition() {
    if (recognition) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      statusCircle.classList.add('listening');
      statusText.textContent = 'Listening...';
    };

    recognition.onresult = event => {
      const userInput = event.results[0][0].transcript.trim();
      if (userInput) {
        processUserInput(userInput);
      }
    };

    recognition.onend = () => {
      isListening = false;
      statusCircle.classList.remove('listening');
      statusText.textContent = 'Processing...';
    };

    recognition.onerror = event => {
      console.error('Recognition error:', event.error);
      resetStatus();
    };
  }

  askButton.addEventListener('click', function () {
    try {
      console.log('Ask button clicked');
      initializeSpeechRecognition();
      if (!micPermissionGranted) {
        requestMicrophonePermission()
          .then(() => {
            micPermissionGranted = true;
            startListening();
          })
          .catch(error => {
            console.error('Permission error:', error);
            displayMessage('Please allow microphone access.', 'system');
          });
      } else {
        startListening();
      }
    } catch (error) {
      console.error('Ask button error:', error);
      resetStatus();
    }
  });

  clearButton.addEventListener('click', function () {
    transcript.innerHTML = '';
    displayMessage('Welcome to Voice Therapist! Click "Ask" and speak about what\'s bothering you.', 'system');
  });

  function startListening() {
    if (!isListening && recognition) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Start listening error:', error);
      }
    }
  }

  function stopListening() {
    if (isListening && recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Stop listening error:', error);
      }
    }
  }

  function stopSpeaking() {
    if (isSpeaking && currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      isSpeaking = false;
    }
  }

  function processUserInput(input) {
    displayMessage(input, 'user');
    stopListening();
    sendToGroq(input);
  }

  function sendToGroq(input) {
    const data = {
      model: CONFIG.MODEL,
      messages: [
        {
          role: "system",
          content: "You are a supportive therapist. Keep responses short, warm, and conversational and wait for 1 second before you reply after the user is done speaking"
        },
        { role: "user", content: input }
      ],
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS
    };

    statusCircle.classList.add('processing');
    statusText.textContent = 'Thinking...';

    console.log('Sending to Groq:', data);
    console.log('API Key exists:', !!CONFIG.GROQ_API_KEY);

    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
      },
      body: JSON.stringify(data)
    })
      .then(response => {
        console.log('Groq response status:', response.status);
        if (!response.ok) {
          return response.text().then(text => {
            console.error('Groq API error response:', text);
            throw new Error(`API Error: ${response.status} - ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Groq response data:', data);
        const aiReply = data.choices[0].message.content.trim();
        displayMessage(aiReply, 'bot');
        speak(aiReply);
      })
      .catch(error => {
        console.error('Groq API error:', error);
        displayMessage('Sorry, I encountered an error. Please try again.', 'system');
        resetStatus();
      });
  }

  async function speak(text) {
    stopSpeaking();
    
    // Check if ElevenLabs API key is available
    if (!CONFIG.ELEVENLABS_API_KEY || !CONFIG.ELEVENLABS_VOICE_ID) {
      console.log('ElevenLabs API key or voice ID not found, using fallback');
      fallbackSpeak(text);
      return;
    }
    
    // Set a timeout to fallback to browser speech if ElevenLabs takes too long
    const timeoutId = setTimeout(() => {
      console.log('ElevenLabs timeout, switching to fallback');
      fallbackSpeak(text);
    }, 3000); // 3 second timeout
    
    try {
      statusText.textContent = 'Speaking...';
      isSpeaking = true;

      console.log('Calling ElevenLabs API...');
      
      // Use faster model and optimized settings
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': CONFIG.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2', // Faster model
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.7,
            style: 0.1,
            use_speaker_boost: false // Disable for speed
          },
          optimize_streaming_latency: 4, // Optimize for low latency
          output_format: 'mp3_22050_32' // Lower quality for speed
        })
      });

      console.log('ElevenLabs response status:', response.status);
      
      if (!response.ok) {
        clearTimeout(timeoutId);
        const errorText = await response.text();
        console.error('ElevenLabs API error response:', errorText);
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      console.log('Audio blob size:', audioBlob.size);
      
      if (audioBlob.size === 0) {
        clearTimeout(timeoutId);
        throw new Error('Empty audio response from ElevenLabs');
      }
      
      clearTimeout(timeoutId); // Clear timeout since we got a response
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      currentAudio = new Audio(audioUrl);
      currentAudio.preload = 'auto'; // Preload for faster playback
      
      currentAudio.oncanplaythrough = () => {
        // Start playing as soon as enough data is loaded
        currentAudio.play().catch(error => {
          console.error('Audio play error:', error);
          fallbackSpeak(text);
        });
      };
      
      currentAudio.onended = () => {
        console.log('ElevenLabs audio ended');
        isSpeaking = false;
        URL.revokeObjectURL(audioUrl);
        resetStatus();
        setTimeout(() => {
          startListening();
        }, 300); // Reduced delay
      };

      currentAudio.onerror = (error) => {
        console.error('Audio playback error:', error);
        isSpeaking = false;
        URL.revokeObjectURL(audioUrl);
        resetStatus();
        fallbackSpeak(text);
      };

      // Load the audio
      currentAudio.load();
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('ElevenLabs TTS error:', error);
      isSpeaking = false;
      // Fallback to browser speech synthesis if ElevenLabs fails
      fallbackSpeak(text);
    }
  }

  function fallbackSpeak(text) {
    console.log('Using fallback speech synthesis');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.1; // Slightly faster
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    isSpeaking = true;
    statusText.textContent = 'Speaking...';

    utterance.onstart = () => {
      console.log('Fallback speech started');
    };

    utterance.onend = () => {
      console.log('Fallback speech ended');
      isSpeaking = false;
      resetStatus();
      setTimeout(() => {
        startListening();
      }, 300); // Reduced delay
    };

    utterance.onerror = (error) => {
      console.error('Fallback speech error:', error);
      isSpeaking = false;
      resetStatus();
    };

    speechSynthesis.speak(utterance);
  }

  function resetStatus() {
    isListening = false;
    isSpeaking = false;
    statusCircle.classList.remove('listening', 'processing');
    statusText.textContent = 'Ready';
  }

  function displayMessage(text, sender) {
    const message = document.createElement('div');
    message.className = `message ${sender}-message`;
    message.textContent = text;
    transcript.appendChild(message);
    transcript.scrollTop = transcript.scrollHeight;
  }
});