import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'rc-progress';

const VideoPlayerWithProgress = ({ videoName }) => {
  const videoRef = useRef(null); // reference to video widget 
  const [lastTime, setLastTime] = useState(0); // last known time of a continuous video chunk 
  const [videoSrc, setVideoSrc] = useState(null); // manage video source
  const [playbackRate, setPlaybackRate] = useState(1.0); // control playback speeds
  const hasSeeked = useRef(false); 
  const [userId, setUserId] = useState(null); // a little thing to simulate auth 
  const cursorLocationRef = useRef(0); // reference to cursor active position

  // track intervals of watched video segments
  const [intervals, setIntervals] = useState([]); // contains all watched sections 
  // track current chunk being watched
  const [progressionChunkTracker, updateProgressionTracker] = useState({ start: 0, end: 0 });

  // helper to merge overlapping intervals-----------------------------------------------------
  function mergeIntervals(intervals) {
    if (intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const current = sorted[i];
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    return merged;
  }
  //-------------------------------------------------------------------------------------------

  // Fetch uid from json for no-sql db collection reference-----------------------------------------------------------------------------
  async function fetchUserId() {
    try {
      const res = await fetch('./user.json'); // inside public directory , can be modified directly too !
      if (!res.ok) throw new Error('Failed to load user file');
      const data = await res.json();
      return data.uid;
    } catch (err) {
      console.error("Error loading UID:", err);
      return null;
    }
  }
  //----------------------------------------------------------------------------------------------------

  // used to sync data to backend . The function syncs last known cursor location and last known watched interval or intervals------------------
  async function syncGapsToServer(currentCursor) {
    try {
      await fetch('http://localhost:3000/progressionSync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoName,
          userId,
          gaps: { [progressionChunkTracker.start]: [progressionChunkTracker.end] },
          cursor_location: currentCursor,
        }),
      });

      console.log('✅ Synced gaps');
    } catch (e) {
      console.error('❌ Failed to sync gaps:', e);
    }
  }
  //-------------------------------------------------------------------------------------------------------
  // a listener to pointer -----------------------------------------------------------------------------------
  function onChangePosition(currentTime, lastTime) {
    const expectedIncrease = playbackRate;
    const actualIncrease = currentTime - lastTime;
    const roundedDiff = Math.round(actualIncrease);
    const roundedExpected = Math.round(expectedIncrease);

    if (roundedDiff <= roundedExpected && currentTime >= progressionChunkTracker.start) { // if the change is constant , it means the cursor is not modified by user !
      // continue current chunk
      updateProgressionTracker(prev => {
        const updated = { ...prev, end: currentTime }; // update the end of current interval and ui too !
        // update last interval live
        setIntervals(prevIntervals => {
          if (prevIntervals.length === 0) return [updated];
          const newIntervals = [...prevIntervals];
          newIntervals[newIntervals.length - 1] = updated;
          return newIntervals;
        });
        return updated;
      });
    } else {
      // seek or jump detected, start new chunk
      const newChunk = { start: currentTime, end: currentTime };
      updateProgressionTracker(newChunk);
      setIntervals(prev => [...prev, newChunk]);
      syncGapsToServer(currentTime); // sync the watched intervals to backend 
    }
  }

  //--------------------------------------------------------------------------------------------------------
  // on any sort of unmount such as reload , tab closed or browser closed , post a sync request to backend!
  function closeSync() {
    if (videoRef.current) {
      const currentCursor = videoRef.current.currentTime;
      syncGapsToServer(currentCursor);
    }
  }
  //--------------------------------------------------------------------------------------------------------
  // when video metadata is loaded from server , seek to last session from where user left off ! -----------
  function seekToCursorLocation(video) {
    video.onloadedmetadata = () => {
      const cursorLocation = cursorLocationRef.current;
      if (!isNaN(video.duration) && cursorLocation > 0 && cursorLocation < video.duration) {
        video.currentTime = cursorLocation;
      }
    };
  }
  //---------------------------------------------------------------------------------------------------------
  // on mount , fetch user id ! ----------------------------------------------------------------------------
  useEffect(() => {
    fetchUserId().then(setUserId);
  }, []);
  //--------------------------------------------------------------------------------------------------------

  // load metadata from servers ---------------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    const fetchProgression = async () => {
      try {
        const response = await fetch(`http://localhost:3000/video?videoName=${videoName}&userId=${userId}`); // GET request 
        if (!response.ok) throw new Error("Video fetch failed");

        const data = await response.json();
        cursorLocationRef.current = parseFloat(data.cursor_location || 0);

        setIntervals(data.intervals || []); // update local intervals array 
        if ((data.intervals || []).length > 0) {
          const lastInterval = data.intervals[data.intervals.length - 1];
          updateProgressionTracker({ start: lastInterval.start, end: lastInterval.end }); // ui update 
        }

        setVideoSrc(data.url);
      } catch (err) {
        console.error("Error fetching progression/video info:", err);
      }
    };

    fetchProgression();

    const handleBeforeUnload = (event) => {
      closeSync();
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload); // listener to listen to un-mount events like reload , tab close and browser close 
    return () => window.removeEventListener('beforeunload', handleBeforeUnload); // remove here so to not allow many listeners on re-mounts 
  }, [videoName, userId]);

  //---------------------------------------------------------------------------------------------------------

  // rateChange control ie the speed playback ---------------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleRateChange = () => setPlaybackRate(video.playbackRate); // a variable holding the rate value 
    video.addEventListener("ratechange", handleRateChange); // listener to changes on ratechanges 
    setPlaybackRate(video.playbackRate); // set playbackRate

    const interval = setInterval(() => {
      if (!video.paused && !video.seeking) {
        const currentTime = video.currentTime;
        onChangePosition(currentTime, lastTime);
        setLastTime(currentTime);
        //localStorage.setItem(`lastVideoTime_${videoName}`, currentTime); // save last recorded to local cache too 
      }
    }, 1000);

    if (!hasSeeked.current) {
      seekToCursorLocation(video);
      hasSeeked.current = true;
    }

    return () => {
      video.removeEventListener("ratechange", handleRateChange); //remove listener to eliminate multiple listeners
      clearInterval(interval);
    };
  }, [lastTime, videoName, playbackRate]);
  //-----------------------------------------------------------------------------------------------------------

  // Merge intervals to calculate total watched time and progress percent
  const mergedIntervals = mergeIntervals(intervals);
  const totalWatched = mergedIntervals.reduce((acc, { start, end }) => acc + (end - start), 0);
  const videoDuration = videoRef.current?.duration || 1;
  var percentComplete = 0
  if ( ((totalWatched / videoDuration) * 100).toFixed(2) <= 101) {
    percentComplete =  ((totalWatched / videoDuration) * 100).toFixed(2);

  }

  return (
    <div style={{ width: '640px' }}>
      <video ref={videoRef} width="640" controls>
        {videoSrc && <source src={videoSrc} type="video/mp4" />}
        Your browser does not support the video tag.
      </video>

      <h1>{percentComplete}% completion</h1>

      <div style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
        <Line percent={0} strokeWidth={3} strokeColor="#00c853" trailColor="#eee" />

        {/* watched intervals overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
            pointerEvents: 'none',
          }}
        >
          {mergedIntervals.map(({ start, end }, idx) => {
            const left = `${(start / videoDuration) * 100}%`;
            const width = `${((end - start) / videoDuration) * 100}%`;
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  height: '100%',
                  left,
                  width,
                  backgroundColor: 'rgba(0, 200, 83, 0.4)',
                  borderRadius: 2,
                }}
              />
            );
          })}
        </div>
      </div>

      <div
        style={{
          maxHeight: '150px',
          overflowY: 'auto',
          marginTop: '20px',
          border: '1px solid #ccc',
          padding: '10px',
        }}
      >
        <h4>Watched Intervals</h4>
        <ul>
          {mergedIntervals.map(({ start, end }, idx) => (
            <li key={idx}>
              From: {start.toFixed(2)}s → To: {end.toFixed(2)}s
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default VideoPlayerWithProgress;
