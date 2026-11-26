/* Runs in the browser audio rendering thread. No audio is stored on disk. */
class UwUCapture111 extends AudioWorkletProcessor{
 constructor(){super();this.frame=new Float32Array(Math.round(sampleRate*.02));this.at=0;this.stopped=false;this.port.onmessage=e=>{if(e.data==='stop')this.stopped=true;};}
 process(inputs,outputs){for(const out of outputs)for(const channel of out)channel.fill(0);if(this.stopped)return false;const input=inputs[0]?.[0];if(!input)return true;for(let i=0;i<input.length;i++){this.frame[this.at++]=input[i];if(this.at===this.frame.length){this.port.postMessage(this.frame,[this.frame.buffer]);this.frame=new Float32Array(Math.round(sampleRate*.02));this.at=0;}}return true;}
}
registerProcessor('uwu-capture111',UwUCapture111);
