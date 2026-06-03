const { getGeminiModel } = require('../lib/gemini');
const { parseGeminiJson } = require('../lib/videoUtils');
const { buildAIContext } = require('../lib/contextEngine');
const { getNotebookTitlePrompt, getNotebookSummaryPrompt, getChatIntroPrompt, getSmartSuggestionsPrompt } = require('../lib/aiPrompts');

async function test() {
  const context = buildAIContext({
    courseId: 'web_dev_id',
    video: { id: 'web_dev_id', title: 'Test Video', subject: 'Computer Science', content: 'test content' },
    segments: [],
  });

  const model = getGeminiModel('gemini-2.0-flash');

  try {
    const [titleRes, summaryRes, introRes, suggestRes] = await Promise.allSettled([
      model.generateContent(getNotebookTitlePrompt(context)),
      model.generateContent(getNotebookSummaryPrompt(context)),
      model.generateContent(getChatIntroPrompt(context)),
      model.generateContent(getSmartSuggestionsPrompt(context)),
    ]);

    console.log('titleRes.status:', titleRes.status);
    console.log('titleRes.value:', titleRes.value);
    
    const text = titleRes.value.response.text();
    console.log('text:', text);

    const parsed = parseGeminiJson(text);
    console.log('parsed:', parsed);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
