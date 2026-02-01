function getStorageKey(filename) {
  if (!filename) return null;
  return `quiz_progress_${filename}`;
}

export function loadProgress(filename) {
  const key = getStorageKey(filename);
  if (!key) return {};
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    console.error("Błąd odczytu postępów:", e);
    return {};
  }
}

export function saveProgress(filename, progress) {
  const key = getStorageKey(filename);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (e) {
    console.error("Błąd zapisu postępów:", e);
  }
}

export function updateQuestionProgress(filename, index, isCorrect) {
  const progress = loadProgress(filename);
  if (!progress[index]) {
    progress[index] = { streak: 0 };
  }

  if (isCorrect) {
    progress[index].streak = (progress[index].streak || 0) + 1;
  } else {
    progress[index].streak = 0;
  }

  saveProgress(filename, progress);
}

export function isQuestionLearned(filename, index) {
  const progress = loadProgress(filename);
  return progress[index] && progress[index].streak >= 3;
}

export function getQuestionStreak(filename, index) {
  const progress = loadProgress(filename);
  return (progress[index] && progress[index].streak) || 0;
}
