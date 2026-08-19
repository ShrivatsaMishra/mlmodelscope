import React, { useEffect, useRef, useState } from "react";
import { Dashboard } from "@uppy/react";

import { useUploadInputControl } from "../UploadInput/useUploadInputControl";
import { getAllowedFileTypes } from "../../../../../helpers/UppyFileTypeCheckerPlugin";
import MicrophoneIcon from "../../../../../resources/icons/icon-microphone-white.png";
import DownloadIcon from "../../../../../resources/icons/icon-download.png";
import {
    convertRecordedAudioToWav,
    getSupportedRecorderMimeType,
    WAV_MIME_TYPE
} from "./audioRecording";

import "./AudioRecorder.scss";

const PYANNOTE_MODEL_NAME = "pyannote_diarization";

export default function AudioRecorder(props) {
    const [permission, setPermission] = useState(false);
    const [stream, setStream] = useState(null);
    const [recordingStatus, setRecordingStatus] = useState("inactive");
    const [audio, setAudio] = useState(null);
    const [recordedFile, setRecordedFile] = useState(null);
    const [preparationError, setPreparationError] = useState(null);
    const [uppyFileId, setUppyFileId] = useState(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const allowedFileTypes = getAllowedFileTypes(props.task);
    const { uppy } = useUploadInputControl({ allowedFileTypes, ...props });
    const requiresWav = props.model?.name === PYANNOTE_MODEL_NAME;

    useEffect(() => {
        if (stream) startRecording();
    }, [stream]);

    useEffect(() => () => {
        if (audio) URL.revokeObjectURL(audio);
    }, [audio]);

    const getMicrophonePermission = async () => {
        setPreparationError(null);
        if (!("MediaRecorder" in window)) {
            setPreparationError("Microphone recording is not supported in this browser.");
            return;
        }

        try {
            const streamData = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            setPermission(true);
            setStream(streamData);
        } catch (error) {
            setPreparationError(error.message || "Microphone access could not be started.");
        }
    };

    const removeMicrophonePermission = (activeStream) => {
        setPermission(false);
        activeStream?.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
        });
        setStream(null);
    };

    const startRecording = () => {
        try {
            const supportedMimeType = getSupportedRecorderMimeType();
            const options = supportedMimeType ? { mimeType: supportedMimeType } : undefined;
            const recorder = new MediaRecorder(stream, options);

            audioChunks.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data?.size > 0) audioChunks.current.push(event.data);
            };
            mediaRecorder.current = recorder;
            setRecordingStatus("recording");
            recorder.start();
        } catch (error) {
            removeMicrophonePermission(stream);
            setRecordingStatus("inactive");
            setPreparationError(error.message || "Audio recording could not be started.");
        }
    };

    const stopRecording = () => {
        const recorder = mediaRecorder.current;
        if (!recorder || recorder.state === "inactive") return;

        setRecordingStatus(requiresWav ? "preparing" : "inactive");
        recorder.onstop = async () => {
            try {
                const recordedMimeType = recorder.mimeType || audioChunks.current[0]?.type || "audio/webm";
                const rawRecording = new Blob(audioChunks.current, { type: recordedMimeType });
                const preparedBlob = requiresWav
                    ? await convertRecordedAudioToWav(rawRecording)
                    : rawRecording;
                const extension = requiresWav ? "wav" : extensionForMimeType(recordedMimeType);
                const fileType = requiresWav ? WAV_MIME_TYPE : recordedMimeType;
                const file = new File(
                    [preparedBlob],
                    `temp-audio-${Date.now()}.${extension}`,
                    { type: fileType }
                );

                setRecordedFile(file);
                setAudio(URL.createObjectURL(file));
                setPreparationError(null);
                uploadAudio(file);
            } catch (error) {
                setRecordedFile(null);
                setAudio(null);
                setPreparationError(error.message || "The recording could not be prepared. Please try again.");
            } finally {
                audioChunks.current = [];
                setRecordingStatus("inactive");
                removeMicrophonePermission(recorder.stream);
            }
        };
        recorder.stop();
    };

    const recordAgain = async () => {
        if (uppyFileId) uppy.removeFile(uppyFileId);
        setUppyFileId(null);
        setRecordedFile(null);
        setAudio(null);
        setPreparationError(null);
        await getMicrophonePermission();
    };

    const uploadAudio = (file) => {
        const fileId = uppy.addFile({
            name: file.name,
            type: file.type,
            data: file,
            source: "Local"
        });
        setUppyFileId(fileId);
    };

    return (
        <div>
            <main>
                <div className="audio-controls">
                    {!permission && !audio && recordingStatus === "inactive" && (
                        <button onClick={getMicrophonePermission} type="button" className="record-button">
                            <img className="record-audio-icon" src={MicrophoneIcon} alt="" />
                            Start Recording
                        </button>
                    )}
                    {recordingStatus === "recording" && (
                        <button onClick={stopRecording} type="button" className="record-button pulsing">
                            <img className="record-audio-icon" src={MicrophoneIcon} alt="" />
                            Stop Recording
                        </button>
                    )}
                    {audio && recordingStatus === "inactive" && (
                        <button className="record-button" type="button" onClick={recordAgain}>
                            <img className="record-audio-icon" src={MicrophoneIcon} alt="" />
                            Record again
                        </button>
                    )}
                </div>

                {recordingStatus === "preparing" && (
                    <p className="audio-preparation-status" role="status">Preparing audio…</p>
                )}
                {preparationError && (
                    <p className="audio-preparation-error" role="alert">{preparationError}</p>
                )}
                {audio && recordedFile && (
                    <div className="audio-container">
                        <audio className="recorded-audio-file" src={audio} controls />
                        <a download={recordedFile.name} href={audio} aria-label="Download recorded audio">
                            <img className="download-audio-icon" src={DownloadIcon} alt="" />
                        </a>
                    </div>
                )}
                {audio && recordingStatus === "inactive" && (
                    <Dashboard uppy={uppy} width="100%" height={220} />
                )}
            </main>
        </div>
    );
}

function extensionForMimeType(mimeType) {
    if (mimeType.includes("mp4")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    return "webm";
}
