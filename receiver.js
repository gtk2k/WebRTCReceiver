const ws = new WebSocket('ws://localhost:8989');
const myPeerId = (new MediaStream()).id;
let senderPeerId;
let peer;

vid.onclick = evt => {
    vid.play();
};

ws.onopen = (evt) => {
    console.log(`ws onopen`);
    SendSignalingMessage({ type: 'new', peerType: 'receiver' });
};

ws.onmessage = async (evt) => {
    const msg = JSON.parse(evt.data);
    if (!peer) {
        createPeer();
    }
    console.log(`onmessage > type: ${msg.type}`);
    if (msg.type === 'offer') {
        senderPeerId = msg.src;
        console.log(`SetRemoteDescription > ${msg.type}`);
        await peer.setRemoteDescription(msg);
        console.log('createAnswer');
        const answer = await peer.createAnswer();
        console.log(`setLocalDescription > ${answer.type}`);
        await peer.setLocalDescription(answer);
        SendSignalingMessage({ type: 'answer', sdp: answer.sdp });
    }
    if (msg.type === 'candidate') {
        console.log('addIceCandidate');
        await peer.addIceCandidate(msg);
    }
};

function createPeer() {
    console.log('createPeer()');
    peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    });
    peer.onicecandidate = (evt) => {
        if (evt.candidate) {
            let { candidate, sdpMid, sdpMLineIndex } = evt.candidate;
            SendSignalingMessage({
                type: 'candidate',
                dst: senderPeerId,
                candidate,
                sdpMid,
                sdpMLineIndex
            });
        }
    };
    peer.onicegatheringstatechange = (evt) => {
        console.log(`iceGatheringState: ${peer.iceGatheringState}`);
    };
    peer.onconnectionstatechange = (evt) => {
        console.log(`connectionState: ${peer.iceConnectionState}`);
    };
    peer.ontrack = (evt) => {
        console.log(`ontrack > ${evt.track.kind}`);
        if (evt.track.kind === 'video') {
            vid.srcObjecnt = evt.streams[0];
            vid.play();
        }
    };
}

function SendSignalingMessage({ dst, type, sdp, candidate, sdpMid, sdpMLineIndex }) {
    console.log(`SendSignalingMessage() > type:${type}`);
    const msg = {
        src: myPeerId,
        dst,
        peerType: 'receiver',
        type,
        sdp,
        candidate,
        sdpMid,
        sdpMLineIndex
    };
    const json = JSON.stringify(msg);
    ws.send(json);
}