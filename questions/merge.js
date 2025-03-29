let ID = 0;
function loadQuestions() {
  const files = ["anatomy.json", "physics.json", "procedures.json"]; // JSON files
  let questions = {};

  const fs = require("fs");

  for (const file of files) {
    const data = require(`./${file}`);
    questions[file.split(".")[0]] = transformQuestions(data);
  }

  fs.writeFile("questions.json", JSON.stringify(questions), function (err) {
    if (err) {
      console.log(err);
    }
  });
}

function transformQuestions(questions) {
  return questions.map((q, _) => {
    const optionKeys = Object.keys(q.options);
    const optionsArray = optionKeys.map((key) => q.options[key]);
    const correctIndex = optionKeys.indexOf(q.correct_answer);
    ID++;
    return {
      id: ID, // Assign a unique ID
      question: q.question_text,
      options: optionsArray,
      correct_answer: correctIndex,
    };
  });
}

loadQuestions();
