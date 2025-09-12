// DOM 요소들 가져오기
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function(){
  // 입력창에 포커스
  userInput.focus();

  // 이벤트 리스너 등록
  sendButton.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', function(e){
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
});

// 메세지 전송 함수
function sendMessage() {
  const message = userInput.value.trim();

  // 빈 메시지 체크
  if (message === '') {
    return;
  }

  // 사용자 메시지 표시
  addMessage(message, 'user');

  // 입력창 비우기
  userInput.value = '';

  // 챗봇 응답 (임시로 간단한 칭찬 메세지)
  setTimeout(() => {
    const praise = generatePraise(message);
    addMessage(praise, 'bot');
  }, 1000); // 1초 후 응답
}

// 메시지를 채팅창에 추가하는 함수
function addMessage(text, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ${sender}-message';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.textContent = text;

  messageDiv.appendChild(messageContent);
  chatMessages.appendChild(messageDiv);

  // 스크롤을 맨 아래로
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 임시 칭찬 메시지 생성 함수 (나중에 AI로 대체 예정)
function generatePraise(userMessage) {
  const praises = [
    "와! 정말 멋진 이야기네요! 😊",
    "당신의 생각이 정말 인상적입니다! 👏",
    "이런 경험을 공유해주셔서 감사해요! ✨",
    "당신은 정말 특별한 분이에요! 💫",
    "이야기를 들으니 제가 다 기분이 좋아져요! 😄",
    "당신의 관점이 정말 흥미롭네요! 🌟",
    "정말 좋은 생각을 갖고 계시네요! 👍",
    "당신과 대화하니까 즐거워요! 💝"
  ];

  // 랜덤하게 칭찬 메시지 선택
  const randomIndex = Math.floor(Math.random() * praises.length);
  return praises[randomIndex];
}

// 입력창 글자 수 제한 표시 (선택사항)
userInput.addEventListener('input', function() {
  const currentLength = userInput.value.length;
  const maxLength = userInput.getAttribute('maxlength');

  // 글자 수가 많을 때 버튼 스타일 변경
  if (currentLength > maxLength * 0.9) {
    userInput.style.borderColor = '#ffc107';
  } else {
    userInput.style.borderColor = '#ddd';
  }
});