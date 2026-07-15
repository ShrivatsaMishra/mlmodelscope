import React from "react";
import useBEMNaming from "../../../../../common/useBEMNaming";
import useTextOutput from "../Text/useTextOutput";
import AudioToTextOutputInputSection from "../AudioToText/AudioToTextOutputInputSection";
import { TextOutputBox } from "../Text/TextOutputBox";
import { audioDiarization } from "../../../../../helpers/TaskIDs";

export default function AudioDiarizationOutput(props) {
    const { getBlock } = useBEMNaming("audio-diarization-output");
    const { output, inferenceDuration, input } = useTextOutput(
        props.trial
    );

    const onSubmit = () => {
        props.onSubmit(input);
    };

    return (
        <div className={getBlock()}>
            <AudioToTextOutputInputSection 
                input={input}
                onSubmit={onSubmit}        
            />

            <TextOutputBox duration={inferenceDuration} output={output} task={audioDiarization} />
        </div>
    );
}
