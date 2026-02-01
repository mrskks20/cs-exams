import { arraysEqual, scrollToTop, scrollToBottom } from "./utils.js";
import { updateQuestionProgress, isQuestionLearned, loadProgress } from "./storage.js";
import { shuffleAndMapQuestions, selectRandomQuestions, selectQuestionsInRange } from "./logic.js";
import * as UI from "./ui.js";

// Global State
let availableFiles = [];
let currentFile = null;
let allQuestions = [];
let currentQuestions = [];
let currentMode = null;
let isChecked = false;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  loadConfig();
  setupEventListeners();
});

function setupEventListeners() {
    document.getElementById("checkBtn").addEventListener("click", checkAnswers);
    document.getElementById("drawNextBtn").addEventListener("click", drawNextRandomQuestions);
    document.getElementById("resetBtn").addEventListener("click", resetQuiz);
    document.getElementById("backBtn").addEventListener("click", backToMenu);
    
    // Scroll buttons
    document.querySelector("button[onclick='scrollToTop()']").onclick = null; // Clean inline
    document.querySelector("button[onclick='scrollToTop()']").addEventListener("click", scrollToTop);
    
    document.querySelector("button[onclick='scrollToBottom()']").onclick = null; // Clean inline
    document.querySelector("button[onclick='scrollToBottom()']").addEventListener("click", scrollToBottom);
}

async function loadConfig() {
  try {
    const response = await fetch("config.json");
    if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
    const config = await response.json();

    if (config.semesters) {
      availableFiles = [];
      config.semesters.forEach((semester) => {
        availableFiles.push(...semester.files);
      });
      UI.renderFileSelector(config.semesters, selectFile);
    } else {
      availableFiles = config.files;
      UI.renderFileSelector([{ title: "Dostępne Kursy", files: availableFiles }], selectFile);
    }

    document.getElementById("loading").style.display = "none";
    document.getElementById("file-selector").style.display = "block";
  } catch (error) {
    UI.showError(
      `<strong>Błąd konfiguracji!</strong><br>Sprawdź plik 'config.json'.<br><small>${error.message}</small>`,
    );
  }
}

async function selectFile(index) {
  document
    .querySelectorAll(".file-card")
    .forEach((card) => card.classList.remove("selected"));
  const selectedCard = document.querySelector(`[data-index="${index}"]`);
  if (selectedCard) selectedCard.classList.add("selected");

  currentFile = availableFiles[index];
  try {
    document.getElementById("loading").style.display = "block";
    const response = await fetch(currentFile.file);
    if (!response.ok)
      throw new Error(`Nie można wczytać pliku: ${currentFile.file}`);
    const rawQuestions = await response.json();
    allQuestions = rawQuestions.map((q, index) => ({ ...q, _originalIndex: index }));


    document.getElementById("loading").style.display = "none";
    document.getElementById("mode-selector").style.display = "block";
    updateGlobalProgressWithDOM();

    document
      .getElementById("mode-selector")
      .scrollIntoView({ behavior: "smooth" });

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      // Cleaning old listeners not strictly needed if we replace elements, but good practice
      btn.onclick = () => selectMode(btn.dataset.mode); 
    });
  } catch (error) {
    UI.showError(`Błąd wczytywania pliku: ${error.message}`);
  }
}

function selectMode(mode) {
  currentMode = mode;
  document.getElementById("file-selector").style.display = "none";
  document.getElementById("mode-selector").style.display = "none";
  prepareQuiz();
}

function prepareQuiz() {
  document.getElementById("quiz-info").style.display = "block";
  document.getElementById("controls").style.display = "block";
  document.getElementById("drawNextBtn").style.display = "none";

  const title = document.getElementById("quiz-title");
  const description = document.getElementById("quiz-description");
  const stats = document.getElementById("quiz-stats");

  document.getElementById("checkBtn").style.display = "inline-block";
  document.getElementById("resetBtn").style.display = "inline-block";

  switch (currentMode) {
    case "study":
      title.textContent = `💡 ${currentFile.name} - Tryb Nauki`;
      description.textContent =
        "Wszystkie pytania z poprawnymi odpowiedziami. Użyj CTRL+F, aby szybko wyszukać.";
      currentQuestions = [...allQuestions];
      document.getElementById("checkBtn").style.display = "none";
      document.getElementById("resetBtn").style.display = "none";
      UI.renderStudyMode(currentQuestions, currentFile.file);
      break;

    case "random5":
      const countInput = document.getElementById("questionCount");
      const questionCount = parseInt(countInput.value) || 5;
      const excludeLearned = document.getElementById("excludeLearned").checked;
      
      title.textContent = `🎲 ${currentFile.name} - Szybki Test`;
      description.textContent = `Wylosowano ${questionCount} pytań z pełnej bazy. Sprawdź swoją wiedzę!`;
      
      const selection = selectRandomQuestions(allQuestions, questionCount, excludeLearned, currentFile.file);
      if (selection.empty) {
           alert("Gratulacje! Wszystkie pytania w tym zestawie zostały uznane za nauczone. Losuję z pełnej puli.");
           const fallback = selectRandomQuestions(allQuestions, questionCount, false, currentFile.file);
           currentQuestions = shuffleAndMapQuestions(fallback.questions);
      } else {
           currentQuestions = shuffleAndMapQuestions(selection.questions);
      }
      
      UI.renderQuizMode(currentQuestions);
      break;

    case "range":
      const startInput = document.getElementById("rangeStart");
      const endInput = document.getElementById("rangeEnd");
      const rangeStart = Math.max(1, parseInt(startInput.value) || 1);
      const rangeEnd = Math.min(allQuestions.length, parseInt(endInput.value) || allQuestions.length);
      
      if (rangeStart > rangeEnd || rangeStart > allQuestions.length) {
        UI.showError("❌ Błąd: Podaj prawidłowy zakres pytań!");
        document.getElementById("mode-selector").style.display = "block";
        return;
      }
      
      title.textContent = `📍 ${currentFile.name} - Test z Zakresu`;
      description.textContent = `Pytania od ${rangeStart} do ${rangeEnd}. Razem ${rangeEnd - rangeStart + 1} pytań. Powodzenia!`;
      const rangeQuestions = selectQuestionsInRange(allQuestions, rangeStart - 1, rangeEnd - 1);
      currentQuestions = shuffleAndMapQuestions(rangeQuestions);
      UI.renderQuizMode(currentQuestions);
      break;

    case "fullquiz":
      title.textContent = `📝 ${currentFile.name} - Pełny Egzamin`;
      description.textContent =
        "Wszystkie pytania w trybie quizu. Pokaż co potrafisz!";
      currentQuestions = shuffleAndMapQuestions([...allQuestions]);
      UI.renderQuizMode(currentQuestions);
      break;
  }
  stats.innerHTML = `<strong>📊 Statystyki:</strong> ${currentQuestions.length} pytań | ${UI.getModeDisplayName(currentMode)}`;
}

function checkAnswers() {
  if (currentQuestions.length === 0 || currentMode === "study") return;

  let correctQuestions = 0;
  let newlyLearnedCount = 0;

  currentQuestions.forEach((question, qIndex) => {
    const checkboxes = document.querySelectorAll(
      `input[data-question="${qIndex}"]`,
    );
    const selectedAnswers = Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => parseInt(cb.dataset.answer));

    if (arraysEqual(selectedAnswers.sort(), question.correct.sort())) {
      correctQuestions++;
      const wasLearned = isQuestionLearned(currentFile.file, question._originalIndex);
      updateQuestionProgress(currentFile.file, question._originalIndex, true);
      const isNowLearned = isQuestionLearned(currentFile.file, question._originalIndex);
      
      if (!wasLearned && isNowLearned) {
        newlyLearnedCount++;
      }
    } else {

      updateQuestionProgress(currentFile.file, question._originalIndex, false);
    }


    checkboxes.forEach((checkbox) => {
      const answerIndex = parseInt(checkbox.dataset.answer);
      const option = checkbox.parentElement;
      option.classList.remove("correct", "incorrect", "missed");

      if (question.correct.includes(answerIndex)) {
        option.classList.add(checkbox.checked ? "correct" : "missed");
      } else if (checkbox.checked) {
        option.classList.add("incorrect");
      }
    });
  });

  document
    .querySelectorAll('input[type="checkbox"]')
    .forEach((cb) => (cb.disabled = true));
  isChecked = true;
  
  processResults(correctQuestions, newlyLearnedCount);

  document.getElementById("legend").style.display = "block";

  if (currentMode === "random5") {
    document.getElementById("drawNextBtn").style.display = "inline-block";
  }
}

function processResults(correctQuestions, newlyLearnedCount) {
    const totalQuestions = currentQuestions.length;
  const percentage = Math.round((correctQuestions / totalQuestions) * 100);

  let grade, gradeColor, encouragement;
  if (percentage === 100) {
    grade = "🏆 Perfekcja!";
    gradeColor = "var(--color-correct)";
    encouragement = "Absolutne mistrzostwo! 🎉";
  } else if (percentage >= 80) {
    grade = "🎉 Znakomity wynik!";
    gradeColor = "#4A90E2";
    encouragement = "Świetna robota! 💪";
  } else if (percentage >= 60) {
    grade = "👍 Dobry wynik!";
    gradeColor = "var(--color-missed)";
    encouragement = "Jesteś na dobrej drodze! 📈";
  } else if (percentage >= 40) {
    grade = "📈 Warto powtórzyć";
    gradeColor = "#F5A623";
    encouragement = "Następnym razem będzie lepiej! 🔄";
  } else {
    grade = "📚 Czas na naukę";
    gradeColor = "var(--color-incorrect)";
    encouragement = "Nie poddawaj się! 🚀";
  }
  
  UI.showResults(correctQuestions, totalQuestions, percentage, grade, gradeColor, encouragement, newlyLearnedCount);
}

function drawNextRandomQuestions() {
  if (currentMode !== "random5") return;

  document.getElementById("results").innerHTML = "";
  document.getElementById("legend").style.display = "none";
  document.getElementById("drawNextBtn").style.display = "none";
  document.getElementById("checkBtn").disabled = false;
  isChecked = false;

  const countInput = document.getElementById("questionCount");
  const questionCount = parseInt(countInput.value) || 5;
  const excludeLearned = document.getElementById("excludeLearned").checked;

  document.getElementById("quiz-description").textContent =
    `Oto kolejny zestaw ${questionCount} pytań. Powodzenia!`;

  const selection = selectRandomQuestions(allQuestions, questionCount, excludeLearned, currentFile.file);
  if (selection.empty) {
       alert("Gratulacje! Wszystkie pytania w tym zestawie zostały uznane za nauczone. Losuję z pełnej puli.");
       const fallback = selectRandomQuestions(allQuestions, questionCount, false, currentFile.file);
       currentQuestions = shuffleAndMapQuestions(fallback.questions);
  } else {
       currentQuestions = shuffleAndMapQuestions(selection.questions);
  }
  
  UI.renderQuizMode(currentQuestions);
}

function resetQuiz() {
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = false;
    checkbox.disabled = false;
    checkbox.parentElement.classList.remove("correct", "incorrect", "missed");
  });
  document.getElementById("checkBtn").disabled = false;
  isChecked = false;
  document.getElementById("results").innerHTML = "";
  document.getElementById("legend").style.display = "none";
  document.getElementById("drawNextBtn").style.display = "none";
  scrollToTop();
}

function backToMenu() {
  ["quiz-info", "controls", "legend"].forEach(
    (id) => (document.getElementById(id).style.display = "none"),
  );
  ["quiz-content", "results"].forEach(
    (id) => (document.getElementById(id).innerHTML = ""),
  );
  ["file-selector"].forEach(
    (id) => (document.getElementById(id).style.display = "block"),
  );
  document.getElementById("mode-selector").style.display = "none";
  if (currentFile) updateGlobalProgressWithDOM();
  currentMode = null;

  isChecked = false;
  document
    .querySelectorAll(".file-card.selected")
    .forEach((c) => c.classList.remove("selected"));
  scrollToTop();
}

function updateGlobalProgressWithDOM() {
  if (!allQuestions || allQuestions.length === 0) return;
  
  const learnedCount = allQuestions.filter(q => isQuestionLearned(currentFile.file, q._originalIndex)).length;
  const total = allQuestions.length;
  const percentage = Math.round((learnedCount / total) * 100);
  
  const bar = document.getElementById("global-progress-bar");
  const text = document.getElementById("global-progress-text");
  
  if (bar && text) {
    bar.style.width = `${percentage}%`;
    text.textContent = `Postęp: ${learnedCount}/${total} opanowanych (${percentage}%)`;
  }
}
