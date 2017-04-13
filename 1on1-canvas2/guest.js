const [ $hostVideo, $hostVideo2, $guestVideo ] = document.querySelectorAll('video');
const [ $hostTextarea, $guestTextarea ] = document.querySelectorAll('textarea');
const [ $startCamera, $closeConnection, $createAnswer ] = document.querySelectorAll('button');


class Guest {
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
        this.stream.guest = stream;
        $guestVideo.srcObject = stream;
      })
      .then(() => {
        $startCamera.disabled = true;
        $createAnswer.disabled = false;
      });
  }

  createAnswer() {
    if ($hostTextarea.value.trim().length === 0) {
      console.warn('paste offer sdp.');
      return;
    }

    const peer = new RTCPeerConnection({
      iceServers: [ { urls: 'stun:stun.skyway.io:3478' } ],
    });

    peer.addEventListener('icecandidate', ev => {
      if (ev.candidate) {
        return;
      }

      const sdp = ev.currentTarget.localDescription.sdp;
      $guestTextarea.value = sdp;
    });

    peer.addEventListener('addstream', ev => {
      if ($hostVideo.srcObject === null) {
        $hostVideo.srcObject = ev.stream;
      } else {
        $hostVideo2.srcObject = ev.stream;
      }
    });

    peer.addStream(this.stream.guest);

    const sdp = new RTCSessionDescription({
      type: 'offer',
      sdp: $hostTextarea.value,
    });
    peer.setRemoteDescription(sdp)
      .then(() => peer.createAnswer())
      .then(sdp => peer.setLocalDescription(sdp));

    $createAnswer.disabled = true;
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

const guest = new Guest();
$startCamera.addEventListener('click', () => guest.startCamera());
$createAnswer.addEventListener('click', () => guest.createAnswer());
$closeConnection.addEventListener('click', () => guest.closeConnection());
