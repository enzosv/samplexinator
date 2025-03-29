function loadQuestions() {
  const files = ["anatomy.json", "physics.json", "procedures.json"]; // JSON files
  let loadedQuestions = [];

  const fs = require("fs");

  for (const file of files) {
    const data = require(`./${file}`);
    loadedQuestions.push(transformQuestions(data, file.split(".")[0]));
  }

  fs.writeFile(
    "questions.json",
    JSON.stringify(loadedQuestions),
    function (err) {
      if (err) {
        console.log(err);
      }
    }
  );
}

function transformQuestions(questions, category) {
  return questions.map((q, index) => {
    const optionKeys = Object.keys(q.options);
    const optionsArray = optionKeys.map((key) => q.options[key]);
    const correctIndex = optionKeys.indexOf(q.correct_answer);

    return {
      id: index + 1, // Assign a unique ID
      question: q.question_text,
      options: optionsArray,
      correct_answer: correctIndex,
      category: category,
    };
  });
}

loadQuestions();
