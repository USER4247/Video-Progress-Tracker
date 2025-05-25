# 🎥 Smart Video Progress Tracker

A smarter way to track **real learning progress** on video lectures by measuring **unique watched content** — not just video completion.

---

## 🔍 Problem Statement

On many e-learning platforms, video progress is marked complete simply when the video ends. This can be misleading — users might **skip content**, **rewatch parts**, or **jump around**, which doesn't reflect true engagement.

---

## 🎯 Objective

This project tracks **which parts of the video a user actually watched**. Progress is:

- ⏱️ Counted only for **unique seconds** viewed
- 💾 **Persisted across sessions**
- 🔁 Updated in **real-time** via backend

---

## 🌟 Features

- ✅ **Unique Interval Tracking**  
  Tracks and records only the video portions that haven’t been watched before.

- 🧠 **Skip Detection**  
  Skipping ahead without watching previous parts won’t increase progress.

- 🔁 **Persistent Progress**  
  Users can resume from where they left off with saved playback and progress data.

- 📈 **Live Progress Display**  
  Updates and displays accurate percentage in real-time.

---

## 🛠️ Tech Stack

- **Frontend:** React.js  
- **Backend:** Express.js + NeDB (NoSQL embedded database)  
- **Video Playback:** HTML5 `<video>` tag  
- **Storage Sync:** API sync for intervals and progress

---

## ⚙️ How It Works

### 🔩 Main Files

- **Backend:**  
  - `backend/server.js`  
    Express server handling video data and progress sync.

- **API Endpoints:**  
  - `GET /video` → returns the video URL and saved progression  
  - `POST /progressionSync` → receives new progress and intervals from the client

---

## 🗄️ Database Structure
NeDB uses a Firestore-like document model. Data is structured as follows:
```
Collection (userId)
└── Document (videoId)
├── cursor_location: <Last position watched>
├── progress: <Float between 0 and 1>
├── duration: <Video duration in seconds>
└── intervals: [ { start, end }, { start, end }, ... ]
```

### Example:

```json
{
  "userId": "abcd1235",
  "videoId": "Sintel-blender-demo",
  "intervals": [ { "start": 0, "end": 2.313597 } ],
  "cursor_location": 212.980773,
  "progress": 0.26,
  "duration": 888,
  "_id": "t8fGwCYzKTtqKpqP"
}
```

---

## 🔧 How to use ?
- Step 1
  - Download Project
  - ```
      git clone https://github.com/USER4247/Video-Progress-Tracker.git
    ```
    or
    simply download the project using github ui

- Step 2
  - change directory to root of the project
    ```
    cd <your rootDir path>
    ```
- Step 3
  - open 2 different terminals in directories
      - frontend
      - backend

  - under backend terminal run the following commands
    ```
    npm install
    ```
    to install dependencies
    ```
    nodemon server.js
    ```
    or
    ```
    node server.js
    ```
        
  - under frontend directory terminal , run the following commands
      ```
    npm install
    ```
    to install dependencies
       ```
          npm run dev
       ```

## Thats'it 
The demo has a widget named "VideoPlayerWithProgress" which is responsible for state management of session and showing progression of video lecture !
![Screenshot](https://github.com/USER4247/Video-Progress-Tracker/blob/main/images/Screenshot%202025-05-25%20043849.png)

## Additional Note 
You can change Video and add more videos by adding new {key:value} pairs to `videoStore` map inside `server.js` . here `key denotes unique video uid and value denotes the url` . You can simulate new user by accessing  `user.json` inside `frontend/public` directory !



