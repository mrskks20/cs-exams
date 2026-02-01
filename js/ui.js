import { scrollToTop } from "./utils.js";
import { getQuestionStreak } from "./storage.js";

// Callbacks needed by UI: selectFile(index), selectMode(mode)
// These will be assigned by main.js
export const uiCallbacks = {
  onSelectFile: null,
  onSelectMode: null
};

export function renderFileSelector(semesters, onSelectFile) {
  const grid = document.getElementById("file-grid");
  grid.innerHTML = "";
  uiCallbacks.onSelectFile = onSelectFile;

  let globalIndex = 0;

  semesters.forEach((semester) => {
    const semesterHeader = document.createElement("div");
    semesterHeader.className = "semester-header";
    semesterHeader.innerHTML = `<h2>${semester.title}</h2>`;
    semesterHeader.style.width = "100%";
    semesterHeader.style.gridColumn = "1 / -1";
    semesterHeader.style.marginTop = "20px";
    semesterHeader.style.marginBottom = "10px";
    semesterHeader.style.color = "var(--color-text-primary)";
    semesterHeader.style.borderBottom = "1px solid var(--color-glass-border)";
    semesterHeader.style.paddingBottom = "10px";
    grid.appendChild(semesterHeader);

    semester.files.forEach((file) => {
      const card = document.createElement("div");
      card.className = "file-card";
      card.dataset.index = globalIndex;
      card.innerHTML = `<h3>${file.name}</h3><p>${file.description}</p>`;

      const capturedIndex = globalIndex;
      // Use the function directly if passed, or callback object
      card.addEventListener("click", () => {
          if (uiCallbacks.onSelectFile) uiCallbacks.onSelectFile(capturedIndex);
      });

      grid.appendChild(card);
      globalIndex++;
    });
  });
}

export function renderStudyMode(questions, currentFilename) {
  const quizContent = document.getElementById("quiz-content");
  quizContent.innerHTML = "";

  questions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "study-question";

    const optionsHtml = q.options
      .map((option, optIndex) => {
        const isCorrect = q.correct.includes(optIndex);
        const marker = isCorrect ? "✅" : "—";
        const className = isCorrect ? "correct" : "incorrect2";

        return `<div class="study-answer ${className}">${marker} ${option}</div>`;
      })
      .join("");

    const streak = getQuestionStreak(currentFilename, q._originalIndex);
    const progressBar = renderProgressBar(streak);

    questionDiv.innerHTML = `
            <h4><span style="display:inline-block; margin-right: 10px;">${progressBar}</span>${index + 1}. ${q.question}</h4>

            <div class="study-answers">
                ${optionsHtml}
            </div>
        `;
    quizContent.appendChild(questionDiv);
  });
  scrollToTop();
  renderLatex();
}

export function renderQuizMode(questions) {
  const quizContent = document.getElementById("quiz-content");
  quizContent.innerHTML = "";

  questions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";

    const optionsHtml = q.options
      .map(
        (option, optIndex) => `
            <div class="option">
                <input type="checkbox" id="q${index}_${optIndex}" data-question="${index}" data-answer="${optIndex}">
                <label for="q${index}_${optIndex}">${option}</label>
            </div>
        `,
      )
      .join("");

    questionDiv.innerHTML = `
            <div class="question-number">Pytanie ${index + 1}/${questions.length}</div>
            <h3>${q.question}</h3>
            ${optionsHtml}
        `;
    quizContent.appendChild(questionDiv);
  });

  addOptionClickHandlers();
  scrollToTop();
  renderLatex();
}

function addOptionClickHandlers() {
  document.querySelectorAll(".option").forEach((option) => {
    option.addEventListener("click", (e) => {
      if (e.target.type !== "checkbox") {
        const cb = option.querySelector('input[type="checkbox"]');
        if (cb && !cb.disabled) cb.checked = !cb.checked;
      }
    });
  });
}

export function renderProgressBar(streak) {
  const maxStreak = 3;
  const effectiveStreak = Math.min(streak, maxStreak);
  
  let html = '';
  for (let i = 0; i < maxStreak; i++) {
    if (i < effectiveStreak) {
      html += '<span style="color: #50E3C2; font-size: 0.8em;">●</span>';
    } else {
      html += '<span style="color: rgba(255,255,255,0.2); font-size: 0.8em;">●</span>';
    }
  }
  
  if (streak >= 3) {
      html += ' <span style="font-size: 0.8em;" title="Opanowane!">🎓</span>';
  }
  
  return html;
}

export function showResults(correctQuestions, totalQuestions, percentage, grade, gradeColor, encouragement, newlyLearnedCount) {
  let masteryMsg = "";
  if (newlyLearnedCount > 0) {
    masteryMsg = `<p style="margin-top: 15px; color: #4A90E2;">🎓 Nauczyłeś się <strong>${newlyLearnedCount}</strong> nowych pytań! Oby tak dalej!</p>`;
  }

  document.getElementById("results").innerHTML = `
        <div class="score">
            <h2 style="color: ${gradeColor}; font-size: 2rem;">${grade}</h2>
            <p style="font-size: 2.5rem; margin: 10px 0;"><strong>${correctQuestions}/${totalQuestions} (${percentage}%)</strong></p>
            <p>${encouragement}</p>
            ${masteryMsg}
        </div>`;
  
  document
    .getElementById("results")
    .scrollIntoView({ behavior: "smooth", block: "center" });
}

export function renderLatex() {
  if (typeof renderMathInElement === "function") {
    renderMathInElement(document.getElementById("quiz-content"), {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  }
}

export function showError(message) {
  document.getElementById("loading").style.display = "none";
  document.getElementById("error-container").innerHTML =
    `<div class="error-message">${message}</div>`;
}

export function getModeDisplayName(mode) {
  const names = {
    study: "Tryb Nauki",
    random5: "Szybki Test",
    range: "Test z Zakresu",
    fullquiz: "Pełny Egzamin",
  };
  return names[mode] || mode;
}
