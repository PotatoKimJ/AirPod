/**
 * Firebase 설정 (고스트 매칭용)
 * https://console.firebase.google.com/ → 프로젝트 생성 → Realtime Database
 * 프로젝트 설정에서 웹 앱 config 복사 후 아래에 붙여넣기
 * FIREBASE_ENABLED = true 로 변경
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const FIREBASE_ENABLED = false;
