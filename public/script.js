// DOM 요소들 가져오기
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const typingIndicator = document.getElementById("typingIndicator");
const charCount = document.getElementById("charCount");
const loadingOverlay = document.getElementById("loadingOverlay");

// 상태 관리
let isTyping = false;
let messageCount = 0;

// 페이지 로드 완료 후 실행
document.addEventListener("DOMContentLoaded", function () {
  initializeChat();
  setupEventListeners();
  updateCharCount();
});

// 채팅 초기화
function initializeChat() {
  userInput.focus();
  console.log("칭찬 챗봇이 준비되었습니다!");
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 전송 버튼 클릭
  sendButton.addEventListener("click", handleSendMessage);

  // enter 키 입력
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // 입력창 변화 감지
  userInput.addEventListener("input", function () {
    updateCharCount();
    updateSendButton();
  });

  // 입력창 포커스/블러
  userInput.addEventListener("focus", function () {
    this.parentElement.style.borderColor = "#667eea";
  });

  userInput.addEventListener("blur", function () {
    this.parentElement.style.borderColor = "#E9ECEF";
  });
}

// 메세지 전송 처리
async function handleSendMessage() {
  const message = userInput.value.trim();

  // 빈 메시지 체크
  if (message === "" || isTyping) {
    return;
  }

  // 사용자 메시지 추가
  addUserMessage(message);

  // 입력창 초기화
  userInput.value = "";
  updateCharCount();
  updateSendButton();

  // 챗봇 응답 생성
  await generateBotResponse(message);
}

// 채팅창에 사용자 메시지 추가 함수
function addUserMessage(text) {
  messageCount++;
  const messageDiv = createMessageElement(text, "user");
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

// 챗봇 메시지 추가
function addBotMessage(text) {
  const messageDiv = createMessageElement(text, "bot");
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

// 메시지 요소 생성
function createMessageElement(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;

  // 아바타
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.innerHTML =
    sender === "bot"
      ? '<i class="fas fa-robot"></i>'
      : '<i class="fas fa-user"></i>';

  // 메시지 내용
  const messageContent = document.createElement("div");
  messageContent.className = "message-content";

  const messageText = document.createElement("div");
  messageText.className = "message-text";
  messageText.innerHTML = text;

  const messageTime = document.createElement("div");
  messageTime.className = "message-time";
  messageTime.textContent = getCurrentTime();

  messageContent.appendChild(messageText);
  messageContent.appendChild(messageTime);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);

  return messageDiv;
}

// API로 응답 생성
async function generateBotResponse(userMessage) {
  try {
    // 타이핑 인디케이터 표시
    showTypingIndicator();

    // 서버 API 호출
    const aiResponse = await callServerAPI(userMessage);

    // 타이핑 인디케이터 숨기기
    hideTypingIndicator();

    // AI 메시지 추가
    addBotMessage(aiResponse);

    // 추가 응답 (30% 확률로 줄임)
    if (Math.random() > 0.7) {
      await delay(2000);
      showTypingIndicator();
      await delay(1000);
      hideTypingIndicator();

      const followUp = generateFollowUpMessage();
      addBotMessage(followUp);
    }
  } catch (error) {
    hideTypingIndicator();
    console.error("API Error:", error);

    // fallback 응답 생성
    const fallbackResponse = generateFallbackPraise(userMessage);

    // 에러 메시지에 따른 다른 처리
    let errorMessage = "현재 AI 서버 연결에 문제가 있어 기본 칭찬을 드렸어요!";
    let showRetryButton = false;

    if (error.message.includes("503") || error.message.includes("overloaded")) {
      errorMessage = "AI가 현재 많이 바빠서 기본 칭찬을 드릴게요!";
      showRetryButton = true;
    } else if (error.message.includes("네트워크")) {
      errorMessage =
        "인터넷 연결을 확인해주세요! 지금은 기본 칭찬으로 응원할게요 📶✨";
      showRetryButton = true;
    }

    // fallback 메시지 + 친화적 에러 설명
    let fullMessage =
      fallbackResponse +
      `<br><small style="color: #666; margin-top: 8px; display: block;">${errorMessage}</small>`;

    // 재시도 버튼 추가
    if (showRetryButton) {
      fullMessage += `<br><button onclick="retryLastMessage('${userMessage.replace(
        /'/g,
        "\\'"
      )}', this)" style="margin-top: 8px; padding: 4px 8px; background: #667eea; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 11px;">🔄 AI로 다시 시도</button>`;
    }

    addBotMessage(fullMessage);
  }
}

// 서버 API 호출 함수 (보안 개선 + 재시도)
async function callServerAPI(userMessage, isRetry = false) {
  try {
    console.log(`서버로 메시지 전송 중... ${isRetry ? "(재시도)" : ""}`);

    // 재시도의 경우 조금 더 대기
    if (isRetry) {
      await delay(2000);
    }

    // 서버의 API 엔드포인트로 요청
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // 503 에러인 경우 특별히 처리
      if (response.status === 503) {
        throw new Error(`서버가 일시적으로 과부하 상태입니다. (503)`);
      }

      throw new Error(errorData.message || `서버 오류 (${response.status})`);
    }

    const data = await response.json();

    if (data.success && data.response) {
      console.log(`AI 응답 받기 성공 ${isRetry ? "(재시도 성공!)" : ""}`);
      return data.response;
    } else {
      throw new Error(data.message || "AI 응답을 받을 수 없습니다.");
    }
  } catch (error) {
    console.error("API 호출 중 오류:", error);
    throw error;
  }
}

// 🛡️ API 오류 시 사용할 기본 칭찬 생성
function generateFallbackPraise(userMessage) {
  const messageLength = userMessage.length;
  const wordCount = userMessage.split(" ").length;

  // 메시지 분석 기반 칭찬
  const analysisBasedPraises = [
    `"${userMessage.substring(0, 20)}${
      userMessage.length > 20 ? "..." : ""
    }" 이런 생각을 하시다니 정말 대단해요! 💭✨`,
    `${wordCount}개의 단어로 이렇게 멋진 이야기를 해주시네요! 당신의 표현력이 너무 좋아요! 📝💫`,
    `이런 깊이 있는 이야기를 들려주셔서 감사해요. 당신은 정말 특별한 관점을 가지고 계시네요! 🌟`,
    `와, ${messageLength}글자의 이야기 속에 이렇게 많은 의미가 담겨있네요! 당신의 생각이 정말 인상적이에요! 🎯`,
  ];

  // 감정 키워드 기반 칭찬
  const emotionKeywords = {
    positive: ["좋", "행복", "기쁘", "즐거", "사랑", "성공", "완성", "달성"],
    effort: ["노력", "시도", "도전", "공부", "연습", "일", "프로젝트"],
    concern: ["걱정", "고민", "어려", "힘들", "문제", "스트레스"],
    creative: ["만들", "그리", "쓰", "디자인", "창작", "아이디어"],
  };

  let emotionType = "general";
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some((keyword) => userMessage.includes(keyword))) {
      emotionType = emotion;
      break;
    }
  }

  const emotionResponses = {
    positive: [
      "정말 멋진 일이네요! 당신의 긍정적인 에너지가 저에게도 전해져요! 😊💫",
      "이런 좋은 소식을 들으니 제가 다 기분이 좋아져요! 축하드려요! 🎉✨",
      "당신의 행복한 모습이 상상이 되네요! 정말 보기 좋아요! 😄💝",
    ],
    effort: [
      "노력하시는 모습이 정말 멋져요! 당신의 열정이 느껴집니다! 💪✨",
      "이렇게 열심히 하시는 당신을 보니 존경스러워요! 👏🌟",
      "꾸준히 노력하시는 모습이 정말 인상적이에요! 응원합니다! 📚💪",
    ],
    concern: [
      "고민을 나누어 주셔서 감사해요. 이런 걸 생각하는 당신이 정말 성숙해요! 🤗💙",
      "어려운 상황에서도 이렇게 솔직하게 말씀해 주시다니, 당신의 용기가 대단해요! 💪💫",
      "고민이 있으시군요. 그래도 이렇게 털어놓을 수 있다는 건 정말 좋은 일이에요! 🌈💝",
    ],
    creative: [
      "창의적인 일을 하고 계시는군요! 당신의 상상력이 정말 멋져요! 🎨✨",
      "무언가를 만드시는 모습이 너무 멋있어요! 당신은 진정한 크리에이터네요! 🌟🎭",
      "아이디어가 정말 흥미로워요! 당신의 창작 능력에 감탄합니다! 💡🎪",
    ],
    general: [
      "당신과 이야기하니까 정말 즐거워요! 😊💫",
      "이런 생각을 가지신 당신이 정말 멋져요! 🌟💝",
      "당신의 이야기를 들으니 제가 다 기분이 좋아져요! ✨😄",
    ],
  };

  // 메시지 길이에 따른 추가 칭찬
  if (messageLength > 100) {
    analysisBasedPraises.push(
      "이렇게 자세하게 이야기해주시니 정말 고마워요! 당신의 소통 능력이 훌륭해요! 💬✨"
    );
  }

  // 랜덤 선택
  const responses = [...analysisBasedPraises, ...emotionResponses[emotionType]];
  return responses[Math.floor(Math.random() * responses.length)];
}

// 후속 메시지 생성
function generateFollowUpMessage() {
  const followUps = [
    "또 어떤 이야기가 있으신가요? 😊",
    "다른 얘기도 들려주세요! 🌟",
    "당신과 더 많은 이야기를 나누고 싶어요! 💫",
    "오늘 하루는 어떠셨나요? ✨",
    "무엇이든 편하게 이야기해주세요! 🤗",
    "당신의 다음 이야기가 궁금해요! 📚",
    "혹시 다른 고민이나 기쁜 일은 없으신가요? 💝",
  ];

  return followUps[Math.floor(Math.random() * followUps.length)];
}

// 타이핑 인디케이터 표시
function showTypingIndicator() {
  isTyping = true;
  typingIndicator.style.display = "block";
  scrollToBottom();
  updateSendButton();
}

// 타이핑 인디케이터 숨기기
function hideTypingIndicator() {
  isTyping = false;
  typingIndicator.style.display = "none";
  updateSendButton();
}

// 글자 수 업데이트
function updateCharCount() {
  const currentLength = userInput.value.length;
  const maxLength = userInput.getAttribute("maxlength");
  charCount.textContent = `${currentLength}/${maxLength}`;

  // 글자 수에 따른 스타일 변경
  if (currentLength > maxLength * 0.9) {
    charCount.style.color = "#ff6b6b";
    userInput.style.borderColor = "#ff6b6b";
  } else if (currentLength > maxLength * 0.7) {
    charCount.style.color = "#ffa726";
    userInput.style.borderColor = "#ffa726";
  } else {
    charCount.style.color = "#999";
    userInput.style.borderColor = "#e9ecef";
  }
}

// 전송 버튼 상태 업데이트
function updateSendButton() {
  const hasText = userInput.value.trim().length > 0;
  sendButton.disabled = !hasText || isTyping;

  if (sendButton.disabled) {
    sendButton.style.opacity = "0.5";
  } else {
    sendButton.style.opacity = "1";
  }
}

// 현재 시간 포맷
function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// 스크롤을 맨 아래로
function scrollToBottom() {
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
}

// 재시도 함수
async function retryLastMessage(message, buttonElement) {
  try {
    // 버튼 비활성화
    buttonElement.disabled = true;
    buttonElement.textContent = "⏳ 재시도 중...";

    // 타이핑 인디케이터 표시
    showTypingIndicator();

    // API 재시도
    const aiResponse = await callServerAPI(message, true);

    // 성공하면 새 메시지 추가
    hideTypingIndicator();
    addBotMessage(
      aiResponse + "<br><small style='color: #4caf50;'>✅ 재시도 성공!</small>"
    );
  } catch (error) {
    hideTypingIndicator();
    console.error("재시도 실패:", error);

    // 재시도도 실패한 경우
    addBotMessage(
      "재시도도 실패했어요. 조금 더 기다려주세요! 🤗<br><small style='color: #ff6b6b;'>💔 AI 서버가 정말 바쁜가봐요</small>"
    );
  }
}

// 지연 함수
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 개발자를 위한 이스터에그
userInput.addEventListener("keydown", function (e) {
  // ctrl + shift + D : 개발자 메시지
  if (e.ctrlKey && e.shiftKey && e.key === "D") {
    e.preventDefault();
    addBotMessage("당신은 소중한 사람입니다. 늘 응원해요. 💻✨");
  }
});

// 접근성 향상
document.addEventListener("keydown", function (e) {
  // ESC 키로 입력창 클리어
  if (e.key === "Escape") {
    userInput.value = "";
    updateCharCount();
    updateSendButton();
    userInput.focus();
  }
});

// 로딩 상태 관리 (추후 API연동시 사용)
function showLoading() {
  loadingOverlay.style.display = "flex";
}
function hideLoading() {
  loadingOverlay.style.display = "none";
}

// 에러 처리
window.addEventListener("error", function (e) {
  console.error("JavaScript Error:", e.error);
  addBotMessage("앗! 뭔가 문제가 생겼네요. 새로고침 후 다시 시도해주세요! 🔄");
});

// 성능 모니터링
console.log("칭찬 챗봇 v3.0 로드 완료! 🚀");
console.log("메시지 개수:", messageCount);
