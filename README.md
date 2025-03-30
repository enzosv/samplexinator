# Samplexinator
A mini webpage to aid in reviewing for the Radiology boards
## Features
- Get a random set of multiple questions from a list of categories and questions
- Form for answering exam
- History to show previous attempts
- Attempt view to show your score
## How to use your own questions
- Given a document that consists of multiple choice questions and indicated answers
1. Ask Deepseek to convert them into the format in [questions.json](./src/questions.json)
  - ChatGPT didn't do so well
2. Replace questions.json with your output
3. If categories changed, change the categories in history.json
4. Modify config.json to indicate how many questions you want per category