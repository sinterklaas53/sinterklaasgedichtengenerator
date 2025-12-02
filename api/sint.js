// Vercel serverless function op /api/sint
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Only POST is allowed" }));
  }

  // Body uitlezen (Vercel geeft soms al geparsed, soms als string)
  let body = req.body;
  if (!body) {
    body = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        try {
          resolve(JSON.parse(data || "{}"));
        } catch {
          resolve({});
        }
      });
    });
  }

  const prompt = (body && body.prompt) || "";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.statusCode = 500;
    return res.end(
      JSON.stringify({ error: "OPENAI_API_KEY is niet ingesteld in Vercel." })
    );
  }

  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "Je bent Sinterklaas. Je schrijft rijmende Sinterklaasgedichten in het Nederlands. Gebruik humor, maar wees vriendelijk.",
          },
          {
            role: "user",
            content:
              "Maak een Sinterklaasgedicht van 8 tot 12 regels op basis van deze omschrijving: " +
              prompt,
          },
        ],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("OpenAI API error:", errText);
      res.statusCode = 500;
      return res.end(
        JSON.stringify({ error: "Fout bij OpenAI API", detail: errText })
      );
    }

    const json = await apiRes.json();
    const text =
      (json.choices &&
        json.choices[0] &&
        json.choices[0].message &&
        json.choices[0].message.content) ||
      "";

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ text }));
  } catch (err) {
    console.error("Fout in /api/sint:", err);
    res.statusCode = 500;
    res.end(
      JSON.stringify({ error: "Interne fout bij het maken van het gedicht" })
    );
  }
};
