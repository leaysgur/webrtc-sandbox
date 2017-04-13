const [ $hostTextarea, $guestTextarea ] = document.querySelectorAll('textarea');
const [ $createAnswer ] = document.querySelectorAll('button');


class Guest {
  constructor() {
    this.peer = null;
    this.dc = null;
  }

  createAnswer() {
    if ($hostTextarea.value.trim().length === 0) {
      console.warn('paste offer sdp.');
      return;
    }

    const peer = new RTCPeerConnection({
      iceServers: [ { urls: 'stun:stun.skyway.io:3478' } ],
    });

    peer.addEventListener('datachannel', ev => {
      window.dc = this.dc = ev.channel;
      this.dc.addEventListener('message', ev => {
        console.log(ev);
      });
    });

    peer.addEventListener('icecandidate', ev => {
      if (ev.candidate) {
        return;
      }

      const sdp = ev.currentTarget.localDescription.sdp;
      $guestTextarea.value = sdp;
    });

    const sdp = new RTCSessionDescription({
      type: 'offer',
      sdp: $hostTextarea.value,
    });
    peer.setRemoteDescription(sdp)
      .then(() => peer.createAnswer())
      .then(sdp => peer.setLocalDescription(sdp));

    $createAnswer.disabled = true;
  }
}

const guest = new Guest();
$createAnswer.addEventListener('click', () => guest.createAnswer());
