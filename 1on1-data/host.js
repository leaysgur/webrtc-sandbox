const [ $hostTextarea, $guestTextarea ] = document.querySelectorAll('textarea');
const [ $createOffer, $setAnswer ] = document.querySelectorAll('button');

class Host {
  constructor() {
    this.peer = null;
    this.dc = null;
  }

  createOffer() {
    const peer = this.peer = new RTCPeerConnection({
      iceServers: [ { urls: 'stun:stun.skyway.io:3478' } ],
    });

    window.dc = this.dc = peer.createDataChannel('my');
    this.dc.addEventListener('message', ev => {
      console.log(ev);
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
  }
}

const host = new Host();
$createOffer.addEventListener('click', () => host.createOffer());
$setAnswer.addEventListener('click', () => host.setAnswer());
