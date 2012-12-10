## Flow
An audiovisual HTML5/WebRTC experiment which analyzes your microphone input's
average frequency, and uses that value to guide a line through space. The only
officially supported browser is Chrome. If you haven't already done so, you need
to enable the "Web Audio Input" flag in "chrome://flags".

This experiment links users in real time via Socket.io and Node.js, so that
each user can see each other users lines, creating a user-driven visual product
in each browser window. Your microphone data is not transmitted, only the calculated
frequency value.

Inspired by:
* [jsantell/beatbox](https://github.com/jsantell/beatbox)
* [Plink](http://labs.dinahmoe.com/plink/)
