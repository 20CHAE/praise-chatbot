export default async function handler(req, res) {
  // CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // CORS preflight 요청 처리
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      message: "POST 요청만 지원합니다.",
    });
  }

  try {
    const { message } = req.body;

    // 메시지 유효성 검사
    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return res.status(400).json({
        error: "Invalid message",
        message: "올바른 메시지를 입력해주세요.",
      });
    }

    // 환경변수에서 API 키 가져오기
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
      return res.status(500).json({
        error: "Configuration error",
        message: "API 설정에 문제가 있습니다.",
      });
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    // 칭찬 전용 프롬프트
    const prompt = `
    당신은 따뜻하고 긍정적인 30년차 칭찬 전문가입니다.
    사용자의 메시지를 분석해서 진심어린 칭찬과 격려를 해주세요.

    규칙:
    1. 항상 긍정적이고 따뜻한 톤으로 답변
    2. 구체적이고 개인화된 칭찬 제공
    3. 이모지 적절히 사용 (2~4개 정도)
    4. 2-3문장으로 간결하게 작성
    5. 한국어로 자연스럽게 답변
    
    사용자 메시지: "${message}"

    위 메시지에 대한 따뜻한 칭찬을 해주세요:
    `;

    // 재시도 로직 (최대 3번 시도)
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Gemini API 호출 시도 ${attempt}/3`);

        // Gemini API 호출
        const response = await fetch(GEMINI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 200,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          lastError = errorData;

          // 503 에러면 잠시 대기 후 재시도
          if (response.status === 503) {
            console.log(
              `503 에러 발생. ${
                attempt < 3 ? "재시도 대기 중..." : "최종 실패"
              }`
            );
            if (attempt < 3) {
              // 지수 백오프: 1초, 2초, 4초 대기
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
              );
              continue;
            }
          }

          // 다른 에러나 최종 시도 실패
          console.error(`Gemini API Error (시도 ${attempt}):`, errorData);
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // 응답 데이터 검증
        if (data && data.candidates && data.candidates.length > 0) {
          const candidate = data.candidates[0];

          if (
            candidate.content &&
            candidate.content.parts &&
            candidate.content.parts.length > 0
          ) {
            const aiResponse = candidate.content.parts[0].text;
            console.log(`성공! (시도 ${attempt}/3)`);

            return res.status(200).json({
              success: true,
              response: aiResponse,
            });
          }
        }

        // 예상과 다른 응답 구조
        console.warn("예상과 다른 Gemini API 응답:", data);
        throw new Error("Invalid response format");
      } catch (fetchError) {
        lastError = fetchError;
        console.error(`시도 ${attempt} 실패:`, fetchError.message);

        if (attempt < 3) {
          // 네트워크 에러도 재시도
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }
    }

    // 모든 재시도 실패
    console.error("모든 재시도 실패. 마지막 에러:", lastError);

    return res.status(503).json({
      error: "Service temporarily unavailable",
      message:
        "AI 서비스가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요. 🤖💙",
      isRetryable: true,
    });
  } catch (error) {
    console.error("서버 에러:", error);
    return res.status(500).json({
      error: "Server error",
      message: "서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  }
}
