// Backend API base URL
const API_BASE = 'http://localhost:3000';

const recordBtn = document.getElementById('recordBtn');
const statusText = document.getElementById('statusText');
const errorEl = document.getElementById('error');
const userTextEl = document.getElementById('userText');
const replyTextEl = document.getElementById('replyText');
const audioPlayer = document.getElementById('audioPlayer');
const sessionInfoEl = document.getElementById('sessionInfo');

let isRecording = false;
let isProcessing = false;
let mediaRecorder = null;
let chunks = [];
let sessionId = null;

// Handle record button (start / stop)
recordBtn.addEventListener('click', async () => {
  if (isProcessing) return;

  if (!isRecording) {
    await startRecording();
  } else {
    stopRecording();
  }
});

// Start recording
async function startRecording() {
  errorEl.textContent = '';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    errorEl.textContent = 'Your browser does not support microphone access.';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
    });

    chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });

      // Stop the microphone
      stream.getTracks().forEach((track) => track.stop());

      // Send the audio to backend
      await sendToBackend(blob);
    };

    mediaRecorder.start();
    isRecording = true;
    recordBtn.textContent = 'Stop & Send';
    statusText.textContent = 'Recording...';
  } catch (err) {
    console.error('getUserMedia error:', err);
    errorEl.textContent =
      'Unable to access microphone. Please check browser and system permissions.';
  }
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.textContent = 'Start Recording';
    statusText.textContent = 'Processing...';
    isProcessing = true;
  }
}

// Send recording to backend API /voice/chat
async function sendToBackend(blob) {
  try {
    const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('voice', 'alloy'); // fixed voice for now

    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    const res = await fetch(`${API_BASE}/voice/chat`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error: ${res.status} ${text}`);
    }

    const data = await res.json();
    // data = { sessionId, userText, replyText, audioBase64 }

    sessionId = data.sessionId;
    sessionInfoEl.textContent = sessionId ? `sessionId: ${sessionId}` : '';

    userTextEl.textContent = data.userText || '(empty)';
    replyTextEl.textContent = data.replyText || '(empty)';

    // Convert base64 to Blob for audio playback
    if (data.audioBase64) {
      const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg');
      const url = URL.createObjectURL(audioBlob);
      audioPlayer.src = url;

      audioPlayer.play().catch((e) => {
        console.warn('Autoplay failed. User interaction required:', e);
      });
    }

    statusText.textContent = 'Done. You can record again.';
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || 'Request failed.';
    statusText.textContent = '';
  } finally {
    isProcessing = false;
  }
}

// Convert base64 → Blob
function base64ToBlob(base64, contentType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}
