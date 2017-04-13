const [ $hostVideo, $guestVideo ] = document.querySelectorAll('video');
const [ $hostTextarea, $guestTextarea ] = document.querySelectorAll('textarea');
const [ $startCamera, $closeConnection, $createOffer, $setAnswer ] = document.querySelectorAll('button');

class Host {
  constructor() {
    this.stream = {
      host: null,
      guest: null,
    };
    this.peer = null;
  }

  startCamera() {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then(stream => {
        this.stream.host = stream;
        $hostVideo.srcObject = stream;
      })
      .then(() => {
        $startCamera.disabled = true;
        $createOffer.disabled = false;
      });
  }

  createOffer() {
    const peer = this.peer = new RTCPeerConnection({
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
      $hostTextarea.value = sdp;
    });

    peer.addEventListener('addstream', ev => {
      this.stream.guest = ev.stream;
      $guestVideo.srcObject = ev.stream;
    });

    peer.addStream(this.stream.host);

    $createOffer.disabled = true;
    $setAnswer.disabled = false;
  }

  setAnswer() {
    if ($guestTextarea.value.trim().length === 0) {
      console.warn('paste answer sdp.');
      return;
    }

    const sdp = new RTCSessionDescription({
      type: 'answer',
      sdp: $guestTextarea.value,
    });
    this.peer.setRemoteDescription(sdp);

    $setAnswer.disabled = true;
    $closeConnection.disabled = false;
  }

  closeConnection() {
    this.peer.getLocalStreams().forEach(_stopTracks);
    this.peer.getRemoteStreams().forEach(_stopTracks);
    this.peer.close();

    $startCamera.disabled = false;
    $closeConnection.disabled = true;

    function _stopTracks(stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }
}

const host = new Host();
$startCamera.addEventListener('click', () => host.startCamera());
$createOffer.addEventListener('click', () => host.createOffer());
$setAnswer.addEventListener('click', () => host.setAnswer());
$closeConnection.addEventListener('click', () => host.closeConnection());
