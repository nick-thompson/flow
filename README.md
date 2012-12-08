*Flow* is an audio-visual experiment relying on WebRTC audio input and support for 
the Web Audio API. The only officially supported browser is Chrome Canary. If 
you haven't already, you must enable the "Web Audio Input" flag in 
"chrome:///flags".

Each active participant is represented by a line. Microphone input is analyzed, 
and the most dominant frequency is used to govern the vertical positioning of 
the line on the canvas. Participants are connected in real time via Socket.io 
and a Node.js server.