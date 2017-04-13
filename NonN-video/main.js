const [ $startCamera, $createOffer, $createAnswer ] = document.querySelectorAll('button');
const [ $myVideo ] = document.querySelectorAll('video');

class User {
  constructor() {
    this.myStream = null;
    this.peers = [];
  }

  startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(stream => {
        this.myStream = stream;
        $myVideo.srcObject = stream;
      })
      .then(() => {
        $startCamera.disabled = true;
      });
  }

  createOffer() {
    const peer = new RTCPeerConnection({
      iceServers: [ { urls: 'stun:stun.skyway.io:3478' } ],
    });

    peer.addEventListener('negotiationneeded', () => {
      peer
        .createOffer()
        .then(sdp => peer.setLocalDescription(sdp));
    });

    peer.addEventListener('icecandidate', ev => {
      if (ev.candidate) {
        return;
      }

      const sdp = ev.currentTarget.localDescription.sdp;

      const div = document.createElement('div');
      div.innerHTML = `
        <textarea>${sdp}</textarea>
        <textarea>for answer</textarea>
      `;
      document.body.append(div);
    });

    peer.addEventListener('addstream', ev => {
      const $video = document.createElement('video');
      $video.autoPlay = true;
      $video.srcObject = ev.stream;
      document.body.lastChild.append($video);
    });

    peer.addStream(this.myStream);

    this.peers.push(peer);
  }

  createAnswer() {
    const [ $_textarea, $textarea ] = document.querySelectorAll('textarea');

    const peer = this.peers[this.peers.length - 1];

    const sdp = new RTCSessionDescription({
      type: 'answer',
      sdp: $textarea.value,
    });
    peer.setRemoteDescription(sdp);

    $_textarea.remove();
    $textarea.remove();
  }
}

const user = new User();

$startCamera.addEventListener('click', () => user.startCamera());
$createOffer.addEventListener('click', () => user.createOffer());
$createAnswer.addEventListener('click', () => user.createAnswer());
