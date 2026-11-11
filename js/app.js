// ==============================================================================
// js/app.js — AI Travel Planner 프런트엔드 메인 스크립트
// ==============================================================================

/**
 * 페이지가 로드되면 실행되는 초기화 이벤트 리스너
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. 추천 기능 관련 DOM 요소 참조
  const recommendForm = document.getElementById('recommend-form');
  const destinationInput = document.getElementById('destination-input');
  const recommendSubmitBtn = document.getElementById('recommend-submit-btn');
  const searchError = document.getElementById('search-error');
  const recommendLoading = document.getElementById('recommend-loading');
  const recommendEmpty = document.getElementById('recommend-empty');
  const recommendCards = document.getElementById('recommend-cards');

  // 추천 결과 카드 1, 2, 예산 카드 내부 요소
  const rec1Title = document.getElementById('rec-1-title');
  const rec1Region = document.getElementById('rec-1-region');
  const rec1Reason = document.getElementById('rec-1-reason');

  const rec2Title = document.getElementById('rec-2-title');
  const rec2Region = document.getElementById('rec-2-region');
  const rec2Reason = document.getElementById('rec-2-reason');

  const budgetAmount = document.getElementById('budget-amount');
  const budgetAssumptions = document.getElementById('budget-assumptions');
  const budgetIncluded = document.getElementById('budget-included');
  const budgetExcluded = document.getElementById('budget-excluded');
  const budgetDisclaimer = document.getElementById('budget-disclaimer');

  // 2. 피드백 작성 관련 DOM 요소 참조
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackInput = document.getElementById('feedback-input');
  const feedbackCounter = document.getElementById('feedback-counter');
  const feedbackSubmitBtn = document.getElementById('feedback-submit-btn');
  const feedbackError = document.getElementById('feedback-error');
  const feedbackSuccess = document.getElementById('feedback-success');

  // 3. 피드백 목록 관련 DOM 요소 참조
  const refreshFeedbackBtn = document.getElementById('refresh-feedback-btn');
  const feedbackListLoading = document.getElementById('feedback-list-loading');
  const feedbackListEmpty = document.getElementById('feedback-list-empty');
  const feedbackListError = document.getElementById('feedback-list-error');
  const feedbackList = document.getElementById('feedback-list');

  // ============================================================================
  // 기능 1: 여행지 추천 제출 처리
  // ============================================================================
  recommendForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 입력값 검증 (앞뒤 공백 제거)
    const destination = destinationInput.value.trim();

    // 에러 상태 초기화
    hideElement(searchError);

    if (!destination) {
      showError(searchError, '여행지를 입력해 주세요. (예: 제주도, 일본 오사카)');
      destinationInput.focus();
      return;
    }

    if (destination.length > 100) {
      showError(searchError, '여행지는 100자 이내로 입력해 주세요.');
      destinationInput.focus();
      return;
    }

    // UI 상태: 로딩 시작 및 버튼 비활성화 (중복 제출 방지)
    setButtonLoading(recommendSubmitBtn, true);
    destinationInput.disabled = true;
    hideElement(recommendEmpty);
    hideElement(recommendCards);
    showElement(recommendLoading);

    try {
      // 서버 API 호출
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result?.error?.message || '추천 결과를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.';
        showError(searchError, errorMsg);
        showElement(recommendEmpty);
        return;
      }

      // 추천 데이터 화면 렌더링
      renderRecommendationData(result.data);
      showElement(recommendCards);
    } catch (err) {
      console.error('Recommend network error:', err);
      showError(searchError, '서버와 통신할 수 없습니다. 인터넷 연결 또는 서버 구동 상태를 확인해 주세요.');
      showElement(recommendEmpty);
    } finally {
      // 로딩 종료 및 버튼 복원
      hideElement(recommendLoading);
      setButtonLoading(recommendSubmitBtn, false);
      destinationInput.disabled = false;
    }
  });

  /**
   * 추천 결과 데이터를 카드 3개에 안전하게 렌더링 (XSS 방지를 위해 textContent 사용)
   */
  function renderRecommendationData(data) {
    const recs = data.recommendations || [];
    const budget = data.budget || {};

    // 1순위 추천 카드
    if (recs[0]) {
      rec1Title.textContent = recs[0].name || '';
      rec1Region.textContent = recs[0].region ? `(${recs[0].region})` : '';
      rec1Reason.textContent = recs[0].reason || '';
    }

    // 2순위 추천 카드
    if (recs[1]) {
      rec2Title.textContent = recs[1].name || '';
      rec2Region.textContent = recs[1].region ? `(${recs[1].region})` : '';
      rec2Reason.textContent = recs[1].reason || '';
    }

    // 예산 카드 금액 범위 포맷팅 (예: 350,000 ~ 550,000 KRW)
    const minFormatted = (budget.min || 0).toLocaleString();
    const maxFormatted = (budget.max || 0).toLocaleString();
    const currency = budget.currency || 'KRW';

    if (budget.min === budget.max) {
      budgetAmount.textContent = `약 ${minFormatted} ${currency}`;
    } else {
      budgetAmount.textContent = `${minFormatted} ~ ${maxFormatted} ${currency}`;
    }

    // 기본 가정 태그 목록 렌더링
    renderListItems(budgetAssumptions, budget.assumptions || []);

    // 포함 항목 렌더링
    renderListItems(budgetIncluded, budget.included || []);

    // 제외 항목 렌더링
    renderListItems(budgetExcluded, budget.excluded || []);

    // 안내 문구
    budgetDisclaimer.textContent = budget.disclaimer || '실제 비용은 여행 시기 및 개인 일정에 따라 다를 수 있습니다.';
  }

  /**
   * 리스트(ul) 요소에 문자열 배열을 안전한 <li>로 렌더링하는 헬퍼 함수
   */
  function renderListItems(container, items) {
    container.innerHTML = ''; // 기존 목록 비우기
    items.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text; // XSS 방지
      container.appendChild(li);
    });
  }

  // ============================================================================
  // 기능 2: 피드백 입력 및 글자 수 카운터 실시간 업데이트
  // ============================================================================
  feedbackInput.addEventListener('input', () => {
    const currentLength = feedbackInput.value.length;
    feedbackCounter.textContent = `${currentLength} / 1000자`;
    hideElement(feedbackError);
    hideElement(feedbackSuccess);
  });

  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = feedbackInput.value.trim();

    hideElement(feedbackError);
    hideElement(feedbackSuccess);

    if (!content) {
      showError(feedbackError, '피드백 내용을 입력해 주세요.');
      feedbackInput.focus();
      return;
    }

    if (content.length > 1000) {
      showError(feedbackError, '피드백은 1,000자 이내로 작성해 주세요.');
      feedbackInput.focus();
      return;
    }

    // 전송 중 상태 처리
    setButtonLoading(feedbackSubmitBtn, true);
    feedbackInput.disabled = true;

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result?.error?.message || '피드백을 저장하지 못했습니다. 작성하신 내용은 유지됩니다.';
        showError(feedbackError, errorMsg);
        return;
      }

      // 성공 시 입력창 초기화 및 성공 메시지
      feedbackInput.value = '';
      feedbackCounter.textContent = '0 / 1000자';
      showSuccess(feedbackSuccess, '소중한 피드백이 성공적으로 등록되었습니다. 감사합니다!');

      // 피드백 목록 실시간 갱신
      loadFeedbackList();
    } catch (err) {
      console.error('Feedback submit network error:', err);
      showError(feedbackError, '네트워크 오류로 피드백을 전송하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setButtonLoading(feedbackSubmitBtn, false);
      feedbackInput.disabled = false;
    }
  });

  // ============================================================================
  // 기능 3: 피드백 목록 불러오기 및 최신순 렌더링
  // ============================================================================
  refreshFeedbackBtn.addEventListener('click', () => {
    loadFeedbackList();
  });

  async function loadFeedbackList() {
    showElement(feedbackListLoading);
    hideElement(feedbackListEmpty);
    hideElement(feedbackListError);
    hideElement(feedbackList);

    try {
      const response = await fetch('/api/feedback-list');
      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result?.error?.message || '피드백 목록을 불러오지 못했습니다.';
        showError(feedbackListError, errorMsg);
        return;
      }

      const listData = result.data || [];

      if (listData.length === 0) {
        showElement(feedbackListEmpty);
        return;
      }

      // 목록 렌더링
      feedbackList.innerHTML = '';
      listData.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'feedback-item';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'feedback-item-header';

        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'feedback-author-badge';
        badgeSpan.textContent = '방문 여행자';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'feedback-date';
        dateSpan.textContent = formatKoreanDate(item.created_at);

        headerDiv.appendChild(badgeSpan);
        headerDiv.appendChild(dateSpan);

        const contentP = document.createElement('p');
        contentP.className = 'feedback-item-content';
        contentP.textContent = item.content; // textContent로 안전한 출력 (XSS 완벽 방어)

        li.appendChild(headerDiv);
        li.appendChild(contentP);
        feedbackList.appendChild(li);
      });

      showElement(feedbackList);
    } catch (err) {
      console.error('Feedback list load error:', err);
      showError(feedbackListError, '피드백 목록을 가져오는 중 오류가 발생했습니다.');
    } finally {
      hideElement(feedbackListLoading);
    }
  }

  // ============================================================================
  // 헬퍼 함수 모음
  // ============================================================================

  function showElement(el) {
    if (el) el.hidden = false;
  }

  function hideElement(el) {
    if (el) el.hidden = true;
  }

  function showError(el, message) {
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  }

  function showSuccess(el, message) {
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  }

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
      btn.classList.add('is-loading');
    } else {
      btn.classList.remove('is-loading');
    }
  }

  /**
   * UTC 시간을 한국어 날짜/시간 형식으로 변환 (예: 2026. 11. 11. 오후 3:15)
   */
  function formatKoreanDate(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(date);
    } catch {
      return isoString;
    }
  }

  // 페이지 처음 로딩 시 피드백 목록 1회 조회
  loadFeedbackList();
});

