import React, { useEffect, useRef, useState } from 'react';
import VideoPlayerWithProgress from '../../widgets/Video/VideoHolder';


export default function VideoScreen (){
    return (
        <>
            <VideoPlayerWithProgress videoName="Sintel-blender-demo" />
        </>
    )
}

//http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4