export const WAV_MIME_TYPE = "audio/wav";

const preferredRecorderMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm"
];

export function getSupportedRecorderMimeType(MediaRecorderClass = window.MediaRecorder) {
  if (typeof MediaRecorderClass?.isTypeSupported !== "function") return "";
  return preferredRecorderMimeTypes.find((type) => MediaRecorderClass.isTypeSupported(type)) || "";
}

export async function convertRecordedAudioToWav(blob, AudioContextClass = getAudioContextClass()) {
  if (!AudioContextClass)
    throw new Error("This browser cannot prepare the recording as compatible audio.");

  const audioContext = new AudioContextClass();
  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    return encodeAudioBufferAsWav(audioBuffer);
  } catch (error) {
    throw new Error("The recording could not be prepared. Please record again or upload a WAV file.");
  } finally {
    try {
      await audioContext.close?.();
    } catch {
      // Closing is best-effort after conversion and should not invalidate a valid WAV.
    }
  }
}

export function encodeAudioBufferAsWav(audioBuffer) {
  const channelCount = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const bytesPerSample = 2;
  const headerSize = 44;
  const wavBuffer = new ArrayBuffer(headerSize + frameCount * bytesPerSample);
  const view = new DataView(wavBuffer);
  const channels = Array.from(
    { length: channelCount },
    (_, channel) => audioBuffer.getChannelData(channel)
  );

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + frameCount * bytesPerSample, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, frameCount * bytesPerSample, true);

  let offset = headerSize;
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sample = 0;
    for (let channel = 0; channel < channelCount; channel += 1)
      sample += channels[channel][frame];
    sample = Math.max(-1, Math.min(1, sample / channelCount));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([wavBuffer], { type: WAV_MIME_TYPE });
}

function getAudioContextClass() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext;
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1)
    view.setUint8(offset + index, value.charCodeAt(index));
}
