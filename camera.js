// ============================================================
// JUPTI - Camera.js
// Gerencia captura de fotos e vídeos
// ============================================================

let currentStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let currentMode = 'photo'; // 'photo' ou 'video'
let currentFacingMode = 'user'; // 'user' (frontal) ou 'environment' (traseira)
let recordingStartTime = null;
let timerInterval = null;

const video = document.getElementById('cameraVideo');
const canvas = document.getElementById('cameraCanvas');
const captureBtn = document.getElementById('captureBtn');
const closeBtn = document.getElementById('cameraCloseBtn');
const flipBtn = document.getElementById('cameraFlipBtn');
const galleryBtn = document.getElementById('galleryBtn');
const recordingTimer = document.getElementById('recordingTimer');
const timerText = document.getElementById('timerText');
const cameraError = document.getElementById('cameraError');
const modeButtons = document.querySelectorAll('.camera-mode-btn');

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    await startCamera();
    setupEventListeners();
});

// ============================================================
// CONFIGURAÇÃO DE EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    // Botão de fechar
    closeBtn.addEventListener('click', () => {
        stopCamera();
        window.history.back();
    });

    // Botão de virar câmera
    flipBtn.addEventListener('click', async () => {
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        await startCamera();
    });

    // Seletor de modo (Foto/Vídeo)
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            
            // Para gravação em andamento ao trocar de modo
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            }
        });
    });

    // Botão de captura
    captureBtn.addEventListener('click', () => {
        if (currentMode === 'photo') {
            capturePhoto();
        } else {
            toggleVideoRecording();
        }
    });

    // Botão de galeria
    galleryBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                processFile(file);
            }
        };
        input.click();
    });
}

// ============================================================
// GERENCIAMENTO DA CÂMERA
// ============================================================
async function startCamera() {
    try {
        // Para stream anterior se existir
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: currentMode === 'video'
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        cameraError.classList.remove('active');
    } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        cameraError.classList.add('active');
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

// ============================================================
// CAPTURA DE FOTO
// ============================================================
function capturePhoto() {
    // Configura o canvas com as dimensões do vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenha o frame atual do vídeo no canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converte para blob
    canvas.toBlob((blob) => {
        if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            processFile(file);
        }
    }, 'image/jpeg', 0.95);
}

// ============================================================
// GRAVAÇÃO DE VÍDEO
// ============================================================
function toggleVideoRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        recordedChunks = [];
        
        // Reinicia a câmera com áudio para vídeo
        const constraints = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: true
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;

        // Configura o MediaRecorder
        const options = { mimeType: 'video/webm;codecs=vp9' };
        
        // Fallback para outros codecs se vp9 não estiver disponível
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
        }

        mediaRecorder = new MediaRecorder(currentStream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });
            processFile(file);
        };

        mediaRecorder.start();
        captureBtn.classList.add('recording');
        recordingTimer.classList.add('active');
        
        // Inicia o timer
        recordingStartTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);

    } catch (error) {
        console.error('Erro ao iniciar gravação:', error);
        alert('Não foi possível iniciar a gravação. Verifique as permissões.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        captureBtn.classList.remove('recording');
        recordingTimer.classList.remove('active');
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        timerText.textContent = '00:00';
    }
}

function updateTimer() {
    if (recordingStartTime) {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        timerText.textContent = `${minutes}:${seconds}`;
    }
}

// ============================================================
// PROCESSAMENTO DE ARQUIVO
// ============================================================
function processFile(file) {
    // Para a câmera
    stopCamera();

    // Salva o arquivo no sessionStorage como base64
    const reader = new FileReader();
    reader.onload = (e) => {
        const mediaData = {
            type: file.type.startsWith('image') ? 'photo' : 'video',
            data: e.target.result,
            filename: file.name
        };
        
        sessionStorage.setItem('capturedMedia', JSON.stringify(mediaData));
        
        // Redireciona para a tela de edição
        window.location.href = 'editar_post.html';
    };
    reader.readAsDataURL(file);
}

// ============================================================
// LIMPEZA AO SAIR
// ============================================================
window.addEventListener('beforeunload', () => {
    stopCamera();
});

