const $video = document.querySelector('video');
const [$offer, $answer] = document.querySelectorAll('textarea');

const pc = new RTCPeerConnection();

navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  .then(stream => {
    $video.srcObject = stream;

    if (typeof pc.addStream === 'function') {
      pc.addStream(stream);
    }
    else {
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
    }
  });

pc.onicecandidate = ev => {
  if (ev.candidate === null) $answer.textContent = JSON.stringify(pc.localDescription);
};

$offer.onchange = ev => {
  const sdp = JSON.parse(ev.target.value);

  pc.setRemoteDescription(sdp)
    .then(() => pc.createAnswer())
    .then(sdp => pc.setLocalDescription(sdp))
    .then(() => $answer.textContent = JSON.stringify(pc.localDescription));
};
