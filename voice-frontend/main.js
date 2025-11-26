// Backend API base URL
const API_BASE = 'http://localhost:3000';

const recordBtn = document.getElementById('recordBtn');
const statusText = document.getElementById('statusText');
const errorEl = document.getElementById('error');
const userTextEl = document.getElementById('userText');
const replyTextEl = document.getElementById('replyText');
const audioPlayer = document.getElementById('audioPlayer');
const sessionInfoEl = document.getElementById('sessionInfo');
const profileInfoEl = document.getElementById('profileInfo');
const voiceInfoEl = document.getElementById('voiceInfo');

let isRecording = false;
let isProcessing = false;
let mediaRecorder = null;
let chunks = [];

// 从 sessionStorage 取 profile / sessionId / 选中的 voice
const rawProfile = sessionStorage.getItem('voice_profile');
let sessionId = sessionStorage.getItem('voice_sessionId');
const selectedVoice = sessionStorage.getItem('voice_selected') || 'alloy';

// 如果没资料或没 sessionId，回到 profile
if (!rawProfile || !sessionId) {
  window.location.href = 'profile.html';
}

const profile = JSON.parse(rawProfile);

// 显示基本信息（可选）
if (profileInfoEl) {
  profileInfoEl.textContent =
    'User: ' + (profile.preferredName || profile.name || 'Unknown');
}
if (voiceInfoEl) {
  voiceInfoEl.textContent = 'Voice: ' + selectedVoice;
}
if (sessionInfoEl) {
  sessionInfoEl.textContent = 'sessionId: ' + sessionId;
}

// 页面加载就调用 /voice/greet 自动问好
window.addEventListener('DOMContentLoaded', greet);

async function greet() {
  try {
    const res = await fetch(`${API_BASE}/voice/greet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice: selectedVoice,
        sessionId,
        profile: JSON.stringify(profile),
      }),
    });

    if (!res.ok) {
      console.error('greet status:', res.status);
      return;
    }

    const data = await res.json();
    // { sessionId, replyText, audioBase64 }

    // 如果后端重置了 sessionId，这里更新一下（一般不会）
    if (data.sessionId) {
      sessionId = data.sessionId;
      sessionInfoEl.textContent = 'sessionId: ' + sessionId;
      sessionStorage.setItem('voice_sessionId', sessionId);
    }

    replyTextEl.textContent = data.replyText || '';

    if (data.audioBase64) {
      const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg');
      const url = URL.createObjectURL(audioBlob);
      audioPlayer.src = url;
      audioPlayer.play().catch((e) => {
        console.warn('Auto-play failed:', e);
      });
    }
  } catch (err) {
    console.error('greet error:', err);
  }
}

// ======================
// 🎤 录音逻辑（和你原来基本一样）
// ======================

recordBtn.addEventListener('click', async () => {
  if (isProcessing) return;

  if (!isRecording) {
    await startRecording();
  } else {
    stopRecording();
  }
});

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

      // 停掉麦克风
      stream.getTracks().forEach((track) => track.stop());

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

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.textContent = 'Start Recording';
    statusText.textContent = 'Processing...';
    isProcessing = true;
  }
}

// ======================
// 🎙️ 发音频到 /voice/chat
// ======================
async function sendToBackend(blob) {
  try {
    const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('voice', selectedVoice); // ⭐ 用选中的声音
    formData.append('sessionId', sessionId);
    formData.append('profile', JSON.stringify(profile)); // 带上资料（可选）

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
    sessionStorage.setItem('voice_sessionId', sessionId);

    userTextEl.textContent = data.userText || '(empty)';
    replyTextEl.textContent = data.replyText || '(empty)';

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

// base64 → Blob
function base64ToBlob(base64, contentType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}
