export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { statute, cases } = req.body;
  if (!statute || !cases) return res.status(400).json({ error: 'Missing statute or cases' });

  const casesText = cases
    .filter(c => c.text)
    .map((c, i) => `${i + 1}. ${c.name.toUpperCase()}: ${c.text}`)
    .join('\n\n');

  const prompt = `You are a legal analyst specializing in disaster liability law. Analyze this statute against the disaster scenarios.

STATUTE:
${statute}

CASES:
${casesText}

Return ONLY valid JSON with NO markdown, NO backticks, NO explanation:
{"actors":["Utility company","Federal agency","State regulator","Local government","Insurer"],"matrix":{"case1":{"Utility company":{"status":"STATUS","note":"under 12 words"},"Federal agency":{"status":"STATUS","note":"under 12 words"},"State regulator":{"status":"STATUS","note":"under 12 words"},"Local government":{"status":"STATUS","note":"under 12 words"},"Insurer":{"status":"STATUS","note":"under 12 words"}},"case2":{"Utility company":{"status":"STATUS","note":"under 12 words"},"Federal agency":{"status":"STATUS","note":"under 12 words"},"State regulator":{"status":"STATUS","note":"under 12 words"},"Local government":{"status":"STATUS","note":"under 12 words"},"Insurer":{"status":"STATUS","note":"under 12 words"}},"case3":{"Utility company":{"status":"STATUS","note":"under 12 words"},"Federal agency":{"status":"STATUS","note":"under 12 words"},"State regulator":{"status":"STATUS","note":"under 12 words"},"Local government":{"status":"STATUS","note":"under 12 words"},"Insurer":{"status":"STATUS","note":"under 12 words"}}},"patterns":["Cross-case observation 1","Observation 2","Observation 3"],"reform_argument":"2-3 sentences arguing for specific legislative reform naming the exact provision that fails."}

Replace every STATUS with exactly one of: Gap — no liability path | Partial — capped/limited | Covered — clear path | Contested — in litigation
Base all analysis on the statute text provided.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
