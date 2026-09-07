const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwahK-gldVDpZTaSC9pD4byZuzRG16xeZYC-agaHw8vG3--w4RBdqldmPW1bh8LiACdAw/exec";

let currentUser = localStorage.getItem('app_user') || '';
let curriculumData = [];
let userSubmissions = [];
let currentDay = null;
let maxWatchedTime = 0;

// عناصر الواجهة
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const lessonSection = document.getElementById('lesson-section');
const userDisplay = document.getElementById('user-display');
const currentUserName = document.getElementById('current-user-name');
const usernameSelect = document.getElementById('username-select');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginErrorMsg = document.getElementById('login-error-msg');
const daysList = document.getElementById('days-list');
const loadingSpinner = document.getElementById('loading-spinner');

const video = document.getElementById('course-video');
const playPauseBtn = document.getElementById('play-pause-btn');
const timeDisplay = document.getElementById('time-display');
const quizContainer = document.getElementById('quiz-container');
const questionsWrapper = document.getElementById('questions-wrapper');
const quizForm = document.getElementById('quiz-form');
const resultBox = document.getElementById('result-box');
const alreadyTestedMsg = document.getElementById('already-tested-msg');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const submitQuizBtn = document.getElementById('submit-quiz-btn');

function getLatestDayNumber() {
  if (!curriculumData.length) return 0;
  return Math.max(...curriculumData.map(d => d.day));
}

async function init() {
  try {
    const res = await fetch('curriculum.json');
    curriculumData = await res.json();
  } catch (err) {
    console.error('تعذر تحميل ملف curriculum.json:', err);
  }

  if (currentUser) {
    showDashboard();
  } else {
    showAuth();
  }
}

async function showAuth() {
  authSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  lessonSection.classList.add('hidden');
  userDisplay.classList.add('hidden');
  loginErrorMsg.classList.add('hidden');
  passwordInput.value = '';

  await loadUsernames();
}

// تحميل أسماء الطلاب من Google Sheets وتعبئة القائمة المنسدلة
async function loadUsernames() {
  usernameSelect.innerHTML = '<option value="">جاري تحميل الأسماء من الشيت...</option>';
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getUsers`);
    const users = await res.json();

    usernameSelect.innerHTML = '<option value="">-- اضغط هنا لاختيار اسمك --</option>';
    users.forEach(user => {
      const opt = document.createElement('option');
      opt.value = user;
      opt.textContent = user;
      usernameSelect.appendChild(opt);
    });
  } catch (err) {
    usernameSelect.innerHTML = '<option value="">تعذر جلب الأسماء، يرجى التحديث</option>';
    console.error('خطأ أثناء جلب قائمة الطلاب:', err);
  }
}

// التحقق من تسجيل الدخول
loginBtn.addEventListener('click', async () => {
  const selectedUser = usernameSelect.value;
  const enteredPass = passwordInput.value.trim();

  if (!selectedUser) {
    showLoginError('يرجى اختيار اسمك من القائمة المنسدلة');
    return;
  }
  if (!enteredPass) {
    showLoginError('يرجى إدخال كلمة المرور');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'جاري التحقق...';
  loginErrorMsg.classList.add('hidden');

  try {
    const url = `${APPS_SCRIPT_URL}?action=login&username=${encodeURIComponent(selectedUser)}&password=${encodeURIComponent(enteredPass)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      currentUser = selectedUser;
      localStorage.setItem('app_user', currentUser);
      showDashboard();
    } else {
      showLoginError('كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مجدداً');
    }
  } catch (err) {
    showLoginError('تعذر الاتصال بالخادم للتحقق من البيانات');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'دخول';
  }
});

function showLoginError(msg) {
  loginErrorMsg.textContent = msg;
  loginErrorMsg.classList.remove('hidden');
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('app_user');
  currentUser = '';
  showAuth();
});

async function showDashboard() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  lessonSection.classList.add('hidden');
  userDisplay.classList.remove('hidden');
  currentUserName.textContent = currentUser;

  await syncUserProgress();
  renderDaysList();
}

backToDashboardBtn.addEventListener('click', () => {
  video.pause();
  showDashboard();
});

async function syncUserProgress() {
  loadingSpinner.classList.remove('hidden');
  daysList.innerHTML = '';

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?username=${encodeURIComponent(currentUser)}`);
    userSubmissions = await res.json();
  } catch (e) {
    console.warn('تعذر قراءة السجلات السابقة:', e);
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

function renderDaysList() {
  daysList.innerHTML = '';
  const latestDay = getLatestDayNumber();

  curriculumData.forEach((item) => {
    const submission = userSubmissions.find(s => s.day === item.day);
    const isCompleted = !!submission;
    const isPastDay = item.day < latestDay;

    let statusText = '';
    let badgeClass = '';

    if (isCompleted) {
      statusText = `تم الاختبار (${submission.score})`;
      badgeClass = 'badge-done';
    } else if (isPastDay) {
      statusText = 'انتهت فترة الاختبار (مشاهدة فقط)';
      badgeClass = 'badge-pending';
    } else {
      statusText = 'اليوم الحالي (الاختبار متاح بعد إكمال المشاهدة)';
      badgeClass = 'badge-pending';
    }

    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div>
        <h3>${item.title}</h3>
        <small>${statusText}</small>
      </div>
      <div>
        <span class="badge ${badgeClass}">
          ${isCompleted ? 'مكتمل' : (isPastDay ? 'سابق' : 'الحالي')}
        </span>
        <button onclick="openDay(${item.day})" style="margin-right: 10px;">فتح</button>
      </div>
    `;
    daysList.appendChild(card);
  });
}

window.openDay = function(dayId) {
  currentDay = curriculumData.find(d => d.day === dayId);
  if (!currentDay) return;

  const latestDay = getLatestDayNumber();
  const isPastDay = currentDay.day < latestDay;

  dashboardSection.classList.add('hidden');
  lessonSection.classList.remove('hidden');
  quizContainer.classList.add('hidden');
  resultBox.classList.add('hidden');
  alreadyTestedMsg.classList.add('hidden');

  document.getElementById('lesson-title').textContent = currentDay.title;
  video.src = currentDay.videoUrl;
  maxWatchedTime = 0;

  const pastRecord = userSubmissions.find(s => s.day === currentDay.day);

  if (pastRecord) {
    alreadyTestedMsg.textContent = `لقد أتممت اختبار هذا اليوم مسبقاً بنتيجة (${pastRecord.score}). يمكنك مشاهدة المقطع للمراجعة فقط.`;
    alreadyTestedMsg.classList.remove('hidden');
  } else if (isPastDay) {
    alreadyTestedMsg.textContent = "هذا اليوم من الأيام السابقة؛ تم إغلاق الاختبار الخاص به ويمكنك مشاهدة المقطع فقط.";
    alreadyTestedMsg.classList.remove('hidden');
  }
};

playPauseBtn.addEventListener('click', () => {
  if (video.paused) {
    video.play();
    playPauseBtn.textContent = 'إيقاف مؤقت';
  } else {
    video.pause();
    playPauseBtn.textContent = 'تشغيل';
  }
});

video.addEventListener('timeupdate', () => {
  if (!video.seeking && video.currentTime > maxWatchedTime) {
    maxWatchedTime = video.currentTime;
  }

  const curMins = Math.floor(video.currentTime / 60).toString().padStart(2, '0');
  const curSecs = Math.floor(video.currentTime % 60).toString().padStart(2, '0');
  const durMins = Math.floor((video.duration || 0) / 60).toString().padStart(2, '0');
  const durSecs = Math.floor((video.duration || 0) % 60).toString().padStart(2, '0');
  timeDisplay.textContent = `${curMins}:${curSecs} / ${durMins}:${durSecs}`;
});

video.addEventListener('seeking', () => {
  if (video.currentTime > maxWatchedTime) {
    video.currentTime = maxWatchedTime;
  }
});

video.addEventListener('ended', () => {
  playPauseBtn.textContent = 'تشغيل';

  const latestDay = getLatestDayNumber();
  const isLatestDay = currentDay.day === latestDay;
  const alreadyDone = userSubmissions.some(s => s.day === currentDay.day);

  if (isLatestDay && !alreadyDone) {
    renderQuiz(currentDay.questions);
    quizContainer.classList.remove('hidden');
    quizContainer.scrollIntoView({ behavior: 'smooth' });
  }
});

function renderQuiz(questions) {
  questionsWrapper.innerHTML = '';
  questions.forEach((q, index) => {
    const block = document.createElement('div');
    block.className = 'question-block';

    let optionsHtml = '';
    q.options.forEach((opt, optIndex) => {
      optionsHtml += `
        <label class="options-label">
          <input type="radio" name="question_${q.id}" value="${optIndex}" required>
          ${opt}
        </label>
      `;
    });

    block.innerHTML = `
      <p>${index + 1}. ${q.text}</p>
      ${optionsHtml}
    `;
    questionsWrapper.appendChild(block);
  });
}

// تسليم الإجابات وإرسالها إلى Google Sheets
quizForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitQuizBtn.disabled = true;
  submitQuizBtn.textContent = 'جاري الإرسال...';

  let score = 0;
  currentDay.questions.forEach((q) => {
    const selected = document.querySelector(`input[name="question_${q.id}"]:checked`);
    if (selected && parseInt(selected.value) === q.correctIndex) {
      score++;
    }
  });

  const total = currentDay.questions.length;
  const percentage = Math.round((score / total) * 100);

  const payload = {
    username: currentUser,
    day: currentDay.day,
    score: `${score}/${total}`,
    percentage: percentage
  };

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    userSubmissions.push(payload);
    quizContainer.classList.add('hidden');
    resultBox.innerHTML = `<strong>تم تسليم الاختبار بنجاح!</strong><br>النتيجة: ${score} من ${total} (${percentage}%)`;
    resultBox.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء حفظ النتيجة');
  } finally {
    submitQuizBtn.disabled = false;
    submitQuizBtn.textContent = 'إرسال الإجابات';
  }
});

init();