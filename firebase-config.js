/**
 * Firebase 설정 (다른 기기 간 매칭용)
 *
 * 1. https://console.firebase.google.com/ 에서 프로젝트 생성
 * 2. Build > Realtime Database > 데이터베이스 만들기
 * 3. 프로젝트 설정(⚙️) > 일반 > 앱 추가 > 웹 > config 복사
 * 4. 아래 firebaseConfig 에 붙여넣기
 * 5. Realtime Database > 규칙: database.rules.json 내용 적용
 * 6. FIREBASE_ENABLED 를 true 로 변경
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

// Firebase 설정 완료 후 true 로 변경
const FIREBASE_ENABLED = false;
