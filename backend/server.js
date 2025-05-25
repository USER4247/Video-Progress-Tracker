const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Datastore = require('nedb');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = new Datastore({ filename: './progression.db', autoload: true });



// video store , you can add more videos if you want here with keys and values 
const videoStore = {
  'Sintel-blender-demo': 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
};





// helper function that creates the nedb database which is a no-sql db like firestore 
function getOrCreateDoc(userId, videoId, cb) {
  db.findOne({ userId, videoId }, (err, doc) => {
    if (err) return cb(err);
    if (doc) return cb(null, doc);
    const newDoc = {
      userId,
      videoId,
      intervals: [],
      cursor_location: 0,
      progress: 0,
      duration: 888.0 // <-- Set your video duration here (in seconds)
    };
    db.insert(newDoc, (err2, insertedDoc) => {
      if (err2) return cb(err2);
      cb(null, insertedDoc);
    });
  });
}

// helper function whuch returns a Promise
function getOrCreateDocPromise(userId, videoId) {
  return new Promise((resolve, reject) => {
    getOrCreateDoc(userId, videoId, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });
}

// Merge overlapping intervals
function mergeIntervalsWithGap(intervals, maxGap = 30) {
  if (!intervals.length) return [];

  // Sort intervals by start time
  intervals.sort((a, b) => a.start - b.start);

  const merged = [];
  let prev = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const curr = intervals[i];

    // If gap between prev.end and curr.start <= maxGap, merge them
    if (curr.start - prev.end <= maxGap) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push(prev);
      prev = curr;
    }
  }
  merged.push(prev);

  return merged;
}

// save data ....
function saveDoc(userId, videoId, updates) {
  return new Promise((resolve, reject) => {
    db.update(
      { userId, videoId },
      { $set: updates },
      { returnUpdatedDocs: true },
      (err, numAffected, affectedDocs) => {
        if (err) {
          console.error('Error saving document:', err);
          return reject(err);
        }
        console.log(`Document updated successfully. Num affected: ${numAffected}`);
        resolve(affectedDocs);
      }
    );
  });
}


// GET /video?videoName=xxx&userId=yyy
app.get('/video', async (req, res) => {
  const requested_video = req.query.videoName;
  const userId = req.query.userId || 'anonymous';

  if (!requested_video || !videoStore[requested_video]) {
    return res.status(404).send('Video not found');
  }

  try {
    const doc = await getOrCreateDocPromise(userId, requested_video);

    return res.status(200).json({
      url: videoStore[requested_video],
      cursor_location: doc.cursor_location,
      progress: doc.progress,
      intervals: doc.intervals
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error retrieving video');
  }
});

// POST /progressionSync
app.post('/progressionSync', async (req, res) => {
  const requested_video = req.body.videoName;
  const userId = req.body.userId;
  const gapMap = req.body.gaps || {};
  const lastCursor_location = req.body.cursor_location;

  console.log(`Syncing progression for user=${userId}, video=${requested_video} ${JSON.stringify(gapMap)}`);

  if (!userId) {
    return res.status(404).send('id not found');
  }

  if (!requested_video || !videoStore[requested_video]) {
    return res.status(404).send('Video not found');
  }

  try {
    const doc = await getOrCreateDocPromise(userId, requested_video);
    const existingGaps = Array.isArray(doc.intervals) ? doc.intervals : [];

    const newGaps = Object.entries(gapMap)
      .map(([start, end]) => ({
        start: parseFloat(start),
        end: parseFloat(end)
      }))
      .filter(({ start, end }) => !isNaN(start) && !isNaN(end) && start < end);

    // Use new merging logic with 30 second gap tolerance
    const mergedGaps = mergeIntervalsWithGap([...existingGaps, ...newGaps], 30);

    const duration = doc.duration || 1;
    const watched = mergedGaps.reduce((acc, { start, end }) => acc + (end - start), 0);
    const progress = Math.min(100, Number(((watched / duration) * 100).toFixed(2)));

    // Clean up doc before saving to avoid duplicated keys in saved doc
    const updatedDoc = await saveDoc(userId, requested_video, {
      intervals: mergedGaps,
      cursor_location: lastCursor_location,
      progress: progress,
      duration: duration // keep duration if needed
    });

    console.log('Final updated document:', updatedDoc);

    res.status(200).send({
      success: true,
      progress,
      cursor_location: lastCursor_location
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error syncing progression');
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
