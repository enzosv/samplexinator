(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // ns-hugo-imp:/Users/enzo/Dev/web/hugo-quiz/assets/js/shared.ts
  var letters = ["A", "B", "C", "D"];
  var storageKey = "quizHistory";
  function fetchQuestions() {
    return __async(this, null, function* () {
      const response = yield fetch("../assets/questions.json");
      if (!response.ok) {
        throw new Error(
          `Failed to fetch questions.json: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    });
  }

  // <stdin>
  var answers = [];
  var questions_count = 0;
  function loadQuestions() {
    return __async(this, null, function* () {
      const data = yield fetchQuestions();
      let loadedQuestions = [];
      for (const category in data) {
        const shuffled = data[category].sort(() => 0.5 - Math.random()).slice(0, category == "physics" ? 4 : 3).map((q) => __spreadProps(__spreadValues({}, q), { category }));
        loadedQuestions = [...loadedQuestions, ...shuffled];
      }
      return loadedQuestions.sort(() => 0.5 - Math.random());
    });
  }
  function renderSamplexQuestions(questions) {
    const container = document.getElementById("quiz-container");
    if (!container) {
      console.error("container could not be found");
      return;
    }
    container.innerHTML = "";
    questions.forEach((q, index) => {
      const div = document.createElement("div");
      div.className = "question border p-3 mb-3 rounded";
      div.innerHTML = `<p><strong>${index + 1}) ${q.question}</strong></p>`;
      for (let i = 0; i < q.options.length; i++) {
        const optionWrapper = document.createElement("div");
        optionWrapper.className = "form-check";
        const input = document.createElement("input");
        input.className = "form-check-input d-none";
        input.type = "radio";
        input.id = `option-${q.id}-${i}`;
        input.name = `question-${q.id}`;
        input.value = i.toString();
        input.addEventListener("change", () => {
          saveAnswer(q.id, i);
        });
        const label = document.createElement("label");
        label.className = "form-check-label btn btn-outline-primary w-100 text-start py-2";
        label.htmlFor = input.id;
        label.innerHTML = `<strong>${letters[i]}</strong>: ${q.options[i]}`;
        optionWrapper.appendChild(input);
        optionWrapper.appendChild(label);
        div.appendChild(optionWrapper);
      }
      container.appendChild(div);
    });
  }
  function saveAnswer(question_id, choice) {
    answers.push({ question_id, user_answer: choice });
    const labels = document.querySelectorAll(
      `label[for^="option-${question_id}-"]`
    );
    labels.forEach((label) => {
      const l = label;
      const input = document.getElementById(l.htmlFor);
      if (input.value === choice.toString()) {
        l.classList.remove("btn-outline-primary");
        l.classList.add("btn-primary", "active");
        return;
      }
      l.classList.remove("btn-primary", "active");
      l.classList.add("btn-outline-primary");
      updateSubmitState();
    });
  }
  function submitAnswers() {
    const data = localStorage.getItem(storageKey);
    const history = data ? JSON.parse(data) : [];
    const attempt = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answers
    };
    history.push(attempt);
    localStorage.setItem(storageKey, JSON.stringify(history));
    globalThis.location.href = `attempt.html?index=${history.length - 1}`;
  }
  document.addEventListener("DOMContentLoaded", function() {
    return __async(this, null, function* () {
      var _a;
      if (!document.getElementById("smartenator")) {
        console.log("prevented");
        return;
      }
      const questions = yield loadQuestions();
      questions_count = questions.length;
      updateSubmitState();
      renderSamplexQuestions(questions);
      (_a = document.getElementById("submit-button")) == null ? void 0 : _a.addEventListener("click", submitAnswers);
    });
  });
  function updateSubmitState() {
    const answeredCount = answers.length;
    const submitButton = document.getElementById(
      "submit-button"
    );
    const answeredCountElement = document.getElementById("answered-count");
    if (answeredCountElement) {
      answeredCountElement.textContent = `${answeredCount} / ${questions_count} Answered`;
    }
    if (submitButton) {
      submitButton.disabled = answeredCount === 0;
    }
  }
})();
