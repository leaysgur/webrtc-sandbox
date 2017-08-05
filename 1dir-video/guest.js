const $video = document.querySelector('video');
const [$offer, $answer] = document.querySelectorAll('textarea');

const pc = new RTCPeerConnection();

pc.addTransceiver('video').setDirection('recvonly');
pc.addTransceiver('audio').setDirection('recvonly');

pc.createOffer()
  .then(sdp => pc.setLocalDescription(sdp));

pc.onicecandidate = ev => {
  if (ev.candidate === null) $offer.textContent = JSON.stringify(pc.localDescription);
};

pc.ontrack = ev => {
  $video.srcObject = ev.streams[0];
};

$answer.onchange = ev => {
  const sdp = JSON.parse(ev.target.value);

  pc.setRemoteDescription(sdp);
};
