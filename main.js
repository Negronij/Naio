const socket = io(); // Conecta con el servidor
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
const peers = {}; // Guardará los RTCPeerConnection de cada usuario

// Captura tu cámara y micrófono
async function initLocalStream() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = stream;
  return stream;
}

let localStream;

initLocalStream().then(stream => {
  localStream = stream;
  socket.emit('join-room', 'miSala'); // Unirse a la sala
});

// Cuando llega una señal de otro usuario
socket.on('signal', async ({ from, data }) => {
  if (!peers[from]) {
    createPeerConnection(from);
  }

  if (data.sdp) {
    await peers[from].setRemoteDescription(new RTCSessionDescription(data.sdp));
    if (data.sdp.type === 'offer') {
      const answer = await peers[from].createAnswer();
      await peers[from].setLocalDescription(answer);
      socket.emit('signal', { to: from, data: { sdp: peers[from].localDescription } });
    }
  } else if (data.candidate) {
    await peers[from].addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

// Crear PeerConnection para un usuario
function createPeerConnection(id) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  peers[id] = pc;

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('signal', { to: id, data: { candidate: event.candidate } });
    }
  };

  pc.ontrack = event => {
    let video = document.getElementById(`remoteVideo-${id}`);
    if (!video) {
      video = document.createElement('video');
      video.id = `remoteVideo-${id}`;
      video.autoplay = true;
      remoteVideos.appendChild(video);
    }
    video.srcObject = event.streams[0];
  };

  return pc;
}

// Cuando entra un nuevo usuario
socket.on('user-joined', id => {
  const pc = createPeerConnection(id);
  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer).then(() => {
      socket.emit('signal', { to: id, data: { sdp: pc.localDescription } });
    });
  });
});
