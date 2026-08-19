import {
  encodeAudioBufferAsWav,
  getSupportedRecorderMimeType,
  WAV_MIME_TYPE
} from "./audioRecording";

describe("audio recording preparation", () => {
  it("selects the first browser-supported WebM recorder type", () => {
    const MediaRecorderClass = {
      isTypeSupported: jest.fn((type) => type === "audio/webm")
    };

    expect(getSupportedRecorderMimeType(MediaRecorderClass)).toBe("audio/webm");
    expect(MediaRecorderClass.isTypeSupported).toHaveBeenCalledWith("audio/webm;codecs=opus");
  });

  it("encodes channel data as mono 16-bit PCM WAV", async () => {
    const audioBuffer = {
      numberOfChannels: 2,
      length: 2,
      sampleRate: 48000,
      getChannelData: (channel) => channel === 0
        ? new Float32Array([1, -1])
        : new Float32Array([1, 1])
    };

    const wav = encodeAudioBufferAsWav(audioBuffer);
    const bytes = await readBlob(wav);
    const view = new DataView(bytes);

    expect(wav.type).toBe(WAV_MIME_TYPE);
    expect(wav.size).toBe(48);
    expect(readAscii(view, 0, 4)).toBe("RIFF");
    expect(readAscii(view, 8, 4)).toBe("WAVE");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(0);
  });
});

function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function readAscii(view, offset, length) {
  return Array.from(
    { length },
    (_, index) => String.fromCharCode(view.getUint8(offset + index))
  ).join("");
}
