/** Lightweight RAG context builder — retrieves job rubric + candidate evidence from DB-shaped objects. */

export function buildEvaluationContext({ job, categories, answers, resumeText, interviewRubric }) {
  const sections = [];

  sections.push(`# Role\n${job?.title || 'Unknown'} — ${job?.team || ''} ${job?.location || ''}`);
  if (job?.description) sections.push(job.description.slice(0, 1500));

  if (categories?.length) {
    sections.push(
      '# Screening rubric\n' +
        categories
          .map(
            (c) =>
              `- ${c.name} (${c.priority || 'mandatory'}, ${c.response_type || 'text'}): ${c.question}\n  Expected: ${c.expected_evidence || '—'}\n  Keywords: ${c.keywords || '—'}`
          )
          .join('\n')
    );
  }

  if (answers?.length) {
    sections.push(
      '# Candidate responses\n' +
        answers
          .map((a) => `Q: ${a.question}\nA: ${(a.body || a.transcript_text || '').slice(0, 800)}`)
          .join('\n\n')
    );
  }

  if (resumeText) sections.push(`# Resume excerpt\n${resumeText.slice(0, 2000)}`);

  if (interviewRubric?.length) {
    sections.push(
      '# Interview rubric\n' +
        interviewRubric.map((q) => `- ${q.question}\n  Expected: ${q.expected_context || '—'}`).join('\n')
    );
  }

  return sections.join('\n\n');
}

export function chunkForPrompt(context, maxChars = 12000) {
  if (context.length <= maxChars) return context;
  return context.slice(0, maxChars) + '\n\n[...truncated for token limit]';
}
