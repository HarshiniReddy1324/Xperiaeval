/** Parse interview transcript into Q&A pairs (free heuristic, paste from Zoom/Meet notes) */

const DEFAULT_INTERVIEW_QUESTIONS = [
  ['Tell me about a recent project you led and the measurable outcome.', 'Specific role, metrics, timeline, and lesson learned.'],
  ['Walk through a difficult technical or stakeholder decision you made.', 'Trade-offs, alternatives considered, and result.'],
  ['How does your experience prepare you for this specific role?', 'Direct tie to job requirements; not generic passion.'],
  ['Describe a time you received critical feedback. How did you respond?', 'Self-awareness, actions taken, outcome.'],
  ['What questions do you have for us about the role or team?', 'Thoughtful, researched questions; not only benefits.'],
];

export function getDefaultInterviewRubric() {
  return DEFAULT_INTERVIEW_QUESTIONS.map(([question, expected_context], i) => ({
    question,
    expected_context,
    sort_order: i,
  }));
}

export function parseTranscript(transcript, rubricQuestions) {
  const text = (transcript || '').trim();
  if (!text) return [];

  const pairs = [];
  const blocks = text.split(/\n(?=(?:Q\d*[:.]|Question\s*\d*[:.]|Interviewer[:.]|Q:))/i);

  if (blocks.length > 1) {
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const qLine = lines[0]?.replace(/^(Q\d*[:.]|Question\s*\d*[:.]|Interviewer[:.]|Q:)\s*/i, '').trim();
      const answer = lines.slice(1).join('\n').replace(/^(A[:.]|Candidate[:.]|Answer:)\s*/i, '').trim();
      if (qLine && answer) pairs.push({ question: qLine, body: answer });
    }
  }

  if (!pairs.length) {
    const alt = text.split(/\n(?=(?:A\d*[:.]|Candidate[:.]|Answer:))/i);
    if (alt.length > 1) {
      let lastQ = rubricQuestions[0]?.question || 'Interview question';
      for (const block of alt) {
        if (/^(A\d*[:.]|Candidate[:.]|Answer:)/i.test(block)) {
          pairs.push({
            question: lastQ,
            body: block.replace(/^(A\d*[:.]|Candidate[:.]|Answer:)\s*/i, '').trim(),
          });
        } else {
          lastQ = block.trim().slice(0, 200);
        }
      }
    }
  }

  if (!pairs.length && rubricQuestions.length) {
    const chunks = text.split(/\n\n+/).filter((c) => c.trim().length > 20);
    chunks.forEach((chunk, i) => {
      const rubric = rubricQuestions[i] || rubricQuestions[rubricQuestions.length - 1];
      pairs.push({
        question: rubric?.question || `Discussion point ${i + 1}`,
        body: chunk.trim(),
      });
    });
  }

  if (!pairs.length && text.length > 30) {
    pairs.push({ question: rubricQuestions[0]?.question || 'Interview discussion', body: text });
  }

  return pairs.map((p, i) => ({
    ...p,
    expected_context: rubricQuestions[i]?.expected_context || rubricQuestions.find((r) => r.question === p.question)?.expected_context || '',
    sort_order: i,
  }));
}
