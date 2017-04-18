const [ $ready, $join, $leave ] = document.querySelectorAll('button');
const [ $myVideo ] = document.querySelectorAll('video');
const { io } = window;


class User {
  constructor() {
    this.myStream = null;
    this.peer = new Map();
    this.socket = io.connect('//localhost:3000/');
  }

  ready() {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(stream => {
        this.myStream = stream;
        $myVideo.srcObject = stream;
      })
      .then(() => {
        $ready.disabled = true;

        this.socket.on('join', ev => this._handleEnter(ev));
        this.socket.on('leave', ev => this._handleLeave(ev));
        this.socket.on('message', ev => this._handleMessage(ev));
      });
  }

  join() {
    this.socket.emit('join');
  }

  leave() {
    this.peer.forEach(pc => {
      pc.getRemoteStreams().forEach(stream => {
        stream.getTracks().forEach(t => t.stop());
      });
      pc.close();
    });
    this.peer.clear();
    document.querySelectorAll('video').forEach((el, idx) => {
      // 0 for me
      idx && el.remove();
    });

    this.socket.emit('leave');
  }

  _handleEnter({ id }) {
    console.log(`${id} join`);

    if (this.peer.has(id)) {
      console.warn('already');
      return;
    }
    const peer = this.__getNewPeer(id);

    peer.createOffer()
      .then(sdp => peer.setLocalDescription(sdp))
      .then(() => {
        console.log(`sendOffer from:${this.socket.id} to:${id}`);
        this.socket.emit('message', {
          to: id,
          type: 'offer',
          data: {
            from: this.socket.id,
            sdp: peer.localDescription,
          }
        });
      });
  }

  _handleLeave({ id }) {
    const peer = this.peer.get(id);
    if (!peer) {
      console.warn('already gone');
      return;
    }
    console.log(`${id} left`);

    peer.close();
    this.peer.delete(id);
    document.getElementById(id).remove();
  }

  _handleMessage({ type, data }) {
    switch (type) {
    case 'offer':
      return this._setOfferAndCreateAnswerBack(data);
    case 'answer':
      return this._setAnswer(data);
    case 'ice':
      return this._addIce(data);
    default:
      console.error(type, data);
    }
  }

  _setOfferAndCreateAnswerBack({ from, sdp }) {
    if (this.peer.has(from)) {
      console.warn('already');
      return;
    }

    const peer = this.__getNewPeer(from);

    console.log('setOffer / createAnswer');
    peer.setRemoteDescription(new RTCSessionDescription(sdp))
      .then(() =>
        peer.createAnswer()
          .then(sdp => peer.setLocalDescription(sdp))
          .then(() => {
            console.log(`sendAnswer from:${this.socket.id} to:${from}`);
            this.socket.emit('message', {
              to: from,
              type: 'answer',
              data: {
                from: this.socket.id,
                sdp: peer.localDescription,
              }
            });
          })
      );
  }

  _setAnswer({ from, sdp }) {
    const peer = this.peer.get(from);
    console.log('setAnswer from', from);

    peer.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  _addIce({ from, candidate }) {
    const peer = this.peer.get(from);

    peer.addIceCandidate(new RTCIceCandidate(candidate));
  }

  __getNewPeer(id) {
    const peer = new RTCPeerConnection({
      iceServers: [ { urls: 'stun:stun.skyway.io:3478' } ],
    });

    peer.addEventListener('icecandidate', ev => {
      if (ev.candidate) {
        this.socket.emit('message', {
          to: id,
          type: 'ice', data: {
            from: this.socket.id,
            candidate: ev.candidate,
          }
        });
      }
    });

    peer.addEventListener('addstream', ev => {
      const $video = document.createElement('video');
      $video.autoPlay = true;
      $video.srcObject = ev.stream;
      $video.id = $video.title = id;
      $video.play(); // for Firefox
      document.body.append($video);
    });

    peer.addStream(this.myStream);
    this.peer.set(id, peer);

    return peer;
  }
}


const user = new User();
$ready.addEventListener('click', () => user.ready());
$join.addEventListener('click', () => user.join());
$leave.addEventListener('click', () => user.leave());
