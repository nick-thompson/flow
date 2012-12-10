## Flow
An audio-visual experiment relying on WebRTC audio input and support for 
the Web Audio API. The only officially supported browser is Chrome. If 
you haven't already, you must enable the "Web Audio Input" flag in 
"chrome:///flags".

Each active participant is represented by a line. Microphone input is analyzed, 
and the spectral centroid of each 1024 sample frames is used to govern the 
vertical positioning of the line on the canvas. Participants are connected in 
real time via Socket.io and a Node.js server. Microphone input itself is not
transmitted to other clients, only the position value.

Inspired by:
* [jsantell/beatbox](https://github.com/jsantell/beatbox)
* [Plink](http://labs.dinahmoe.com/plink/)
