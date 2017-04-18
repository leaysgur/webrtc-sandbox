// @flow
import React, { Component } from 'react';
import {
  Button,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  RTCView,
  getUserMedia,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import Permissions from 'react-native-permissions';
import io from 'socket.io-client';

const SOCKET_URL = 'http://192.168.0.4:3000';


class HelloWebRTC extends Component {
  state: {
    videoURL: string | null;
    permissions: { cam: string, mic: string } | null;
  }
  onPress: () => void;

  constructor() {
    super();

    this.state = {
      videoURL: null,
      permissions: null,
      remotes: [],
    };
    this.myStream = null;
    this.peer = new Map();
    this.socket = io(SOCKET_URL);
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to ReactNativeWebRTC!
        </Text>
        <RTCView style={styles.rtc} streamURL={this.state.videoURL} />
        <Button
          onPress={() => this.onPress()}
          title="[ getUserMedia() -> standby ]"
          color="#841584"
        />
        <View style={styles.others}>
          { this.state.remotes.map((url, idx) => {
            const style = styles.remotes;
            style.backgroundColor = `#12${idx}`;
            return <RTCView key={idx} streamURL={url} style={style} />
          }) }
        </View>
      </View>
    );
  }

  componentDidMount() {
    Promise.all([
      Permissions.requestPermission('camera'),
      Permissions.requestPermission('microphone'),
    ])
    .then(([cam, mic]) => {
      this.setState({ permissions: { cam, mic } });
    });
  }

  onPress() {
    getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
        }
      },
      stream => {
        this.setState({ videoURL: stream.toURL() });
        this.myStream = stream;

        this.socket.on('join', ev => this._handleEnter(ev));
        this.socket.on('message', ev => this._handleMessage(ev));
      },
      err => console.error(err)
    );
  }

  _handleEnter({ id }) {
    console.log(`${id} join`);

    if (this.peer.has(id)) {
      console.warn('already');
      return;
    }
    const peer = this.__getNewPeer(id);

    peer.createOffer(sdp => {
      peer.setLocalDescription(sdp, () => {
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
    });
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
    peer.setRemoteDescription(new RTCSessionDescription(sdp), () => {
      peer.createAnswer(sdp => {
        peer.setLocalDescription(sdp, () => {
          console.log(`sendAnswer from:${this.socket.id} to:${from}`);
          this.socket.emit('message', {
            to: from,
            type: 'answer',
            data: {
              from: this.socket.id,
              sdp: peer.localDescription,
            }
          });
        });
      });
    });
  }

  _setAnswer({ from, sdp }) {
    const peer = this.peer.get(from);
    console.log('setAnswer from', from);

    peer.setRemoteDescription(new RTCSessionDescription(sdp), () => {});
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
      const remotes = this.state.remotes.slice();
      remotes.push(ev.stream.toURL());

      this.setState({ remotes });
    });

    peer.addStream(this.myStream);
    this.peer.set(id, peer);

    return peer;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    paddingTop: 10,
  },
  rtc: {
    flex: 1,
    width: 640,
    backgroundColor: '#000',
  },
  others: {
    backgroundColor: '#eee',
    width: 640,
    height: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  remotes: {
    width: 100,
    height: 100,
  },
});

export default HelloWebRTC;
